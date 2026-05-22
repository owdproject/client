import { markRaw } from 'vue'
import { ref, computed } from '@vue/reactivity'
import { replacer, reviver } from 'json-arraybuffer-reviver'
import { slugify } from 'owd-app-wasmboy/utils/utilWasmboy'

const DB_NAME = 'wasmboy'
const STORE_NAME = 'keyval'

/**
 * Opens the IndexedDB database and returns the database instance.
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)

    request.onerror = () => reject(new Error('Error opening IndexedDB'))
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result)
  })
}

/**
 * Performs a transaction on IndexedDB
 */
async function withTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], mode)
    const store = transaction.objectStore(STORE_NAME)

    action(store).then(resolve).catch(reject)

    transaction.oncomplete = () => {}
    transaction.onerror = () => reject(new Error('Transaction failed'))
  })
}

function arraysAreEqual(arr1: Uint8Array, arr2: Uint8Array): boolean {
  return (
    arr1.length === arr2.length &&
    arr1.every((value, index) => value === arr2[index])
  )
}

const list = ref<WasmboyGame[]>([])

const currentGameKey = ref<any>()
const currentGameStates = ref<any>([])

const currentGame: ComputedRef<WasmboyGame | undefined> = computed(() => {
  return list.value.find((game) => {
    return arraysAreEqual(game.cartridgeInfo.header, currentGameKey.value)
  })
})

/**
 * Composable for WasmBoy game management
 */
export function useWasmboyLibrary() {
  /**
   * Fetches all saved games from IndexedDB
   */
  async function getAllGames(): Promise<
    { cartridgeRom: any; saveStates: any[] }[]
  > {
    return withTransaction('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(markRaw(request.result))
        request.onerror = () => reject(new Error('Error reading IndexedDB'))
      })
    })
  }

  /**
   * Fetches the latest game from IndexedDB
   */
  async function getLatestGame(): Promise<{ cartridgeRom: any } | undefined> {
    const allGames = await getAllGames()
    return allGames.length ? allGames[allGames.length - 1] : undefined
  }

  /**
   * Deletes a game completely from IndexedDB
   */
  async function deleteGame(gameKey: string): Promise<void> {
    return withTransaction('readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(gameKey)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error('Error deleting game'))
      })
    })
  }

  /**
   * Fetches the save states for a specific game by its key
   */
  async function getSaveStatesForGame(gameKey: string): Promise<any[]> {
    return withTransaction('readonly', (store) => {
      return new Promise((resolve, reject) => {
        const getRequest = store.get(gameKey)

        getRequest.onsuccess = () => {
          const gameData = getRequest.result
          if (!gameData) {
            return reject()
          }

          resolve(gameData.saveStates || [])
        }
        getRequest.onerror = () => reject(new Error('Error reading IndexedDB'))
      })
    })
  }

  /**
   * Deletes a specific save state from a game
   */
  async function deleteSaveState(
    gameKey: string,
    saveTimestamp: number,
  ): Promise<any> {
    return withTransaction('readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const getRequest = store.get(gameKey)

        getRequest.onsuccess = () => {
          const gameData = getRequest.result
          if (!gameData) return reject(new Error('Game not found'))

          gameData.saveStates = gameData.saveStates.filter(
            (save: any) => save.date !== saveTimestamp,
          )

          const updateRequest = store.put(gameData, gameKey)
          updateRequest.onsuccess = () => resolve(gameData.saveStates)
          updateRequest.onerror = () =>
            reject(new Error('Error updating IndexedDB'))
        }
        getRequest.onerror = () => reject(new Error('Error reading IndexedDB'))
      })
    })
  }

  async function importGameStatesBackupFromFile(file: File): Promise<void> {
    function deserializeWasmboyMemory(wasmboyMemory: any): any {
      const serialized: any = {}

      for (const key in wasmboyMemory) {
        serialized[key] = JSON.parse(wasmboyMemory[key], reviver)
      }

      return serialized
    }

    return new Promise(async (resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer
          const decoder = new TextDecoder('utf-8')
          const jsonString = decoder.decode(arrayBuffer)

          const importedData = JSON.parse(jsonString)

          const header = JSON.parse(importedData.header, reviver)

          const saveStates = importedData.saveStates.map((saveState) => {
            return {
              date: saveState.date,
              isAuto: saveState.isAuto,
              wasmboyMemory: deserializeWasmboyMemory(saveState.wasmboyMemory),
            }
          })

          // Use withTransaction to handle the database operation
          await withTransaction('readwrite', async (store) => {
            return new Promise<void>((resolve, reject) => {
              // 1. Get the existing data
              const request = store.get(header)
              request.onsuccess = () => {
                const existingData = request.result
                if (existingData) {
                  // 2. Update with imported save states.
                  existingData.saveStates = saveStates

                  const putRequest = store.put(existingData, header)
                  putRequest.onsuccess = () => {
                    resolve()
                  }
                  putRequest.onerror = () => {
                    const error = putRequest.error
                    reject(error)
                  }
                } else {
                  const error = new Error(
                    `Voce con header ${header} non trovata nel database.`,
                  )
                  reject(error)
                }
              }
              request.onerror = () => {
                const error = request.error
                reject(error)
              }
            })
          })

          await refreshCurrentGameStates()

          resolve()
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(reader.error)
      }

      reader.readAsArrayBuffer(file)
    })
  }

  async function exportGameStatesBackupToFile() {
    const saveStates = toRaw(currentGameStates.value)

    function serializeWasmboyMemory(wasmboyMemory: any): any {
      const serialized: any = {}

      for (const key in wasmboyMemory) {
        serialized[key] = JSON.stringify(wasmboyMemory[key], replacer)
      }

      return serialized
    }

    const exportData = {
      header: JSON.stringify(currentGameKey.value, replacer),
      saveStates: saveStates.map((saveState) => {
        return {
          date: saveState.date,
          isAuto: saveState.isAuto,
          wasmboyMemory: serializeWasmboyMemory(saveState.wasmboyMemory),
        }
      }),
    }

    const jsonString = JSON.stringify(exportData)

    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(currentGame.value?.cartridgeInfo.titleAsString)}.backup`
    a.click()

    URL.revokeObjectURL(url)
  }

  // Refresh the list of all games from IndexedDB
  async function refreshGameList() {
    list.value = await getAllGames()
  }

  // Reset the list to an empty array
  function resetGameList() {
    list.value = []
  }

  // Remove a game by key
  async function removeGame(gameKey: string) {
    await deleteGame(gameKey)
    await refreshGameList()
  }

  // Remove a specific save state from a game
  async function refreshCurrentGameStates() {
    currentGameStates.value = await getSaveStatesForGame(currentGameKey.value)
  }

  // Remove a specific save state from a game
  async function removeGameState(saveTimestamp: number) {
    await deleteSaveState(currentGameKey.value, saveTimestamp)
    await refreshCurrentGameStates()
  }

  // Set current game rom header
  async function setCurrentGameKey(gameKey: string) {
    currentGameKey.value = gameKey
    await refreshCurrentGameStates()
  }

  // Computed property to get the latest game
  const latestGame = computed(() =>
    list.value.length ? list.value[list.value.length - 1] : undefined,
  )

  return {
    list,
    latestGame,
    currentGame,
    currentGameKey,
    currentGameStates,
    refreshGameList,
    resetGameList,
    removeGame,
    removeGameState,
    setCurrentGameKey,
    refreshCurrentGameStates,
    importGameStatesBackupFromFile,
    exportGameStatesBackupToFile,
  }
}
