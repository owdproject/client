import { useDesktopVolumeStore } from '@owdproject/core/runtime/stores/storeDesktopVolume'
import { markRaw } from 'vue'

export const wasmboyConfig = {
  isAudioEnabled: true,
  enableAudioDebugging: true,
  isGbcEnabled: true,
  isGbcColorizationEnabled: false,
  useGbcWhenOptional: true,
  onPause: () => {},
  onLoadedAndStarted: () => {},
  updateAudioCallback: (
    audioContext: AudioContext,
    audioBufferSourceNode: AudioBufferSourceNode,
  ): AudioNode => {
    const desktopVolumeStore = useDesktopVolumeStore()
    const gainNode = audioContext.createGain()
    gainNode.gain.value = desktopVolumeStore.master / 100

    audioBufferSourceNode.connect(gainNode)
    gainNode.connect(audioContext.destination)

    return gainNode
  },
}

export async function getAllGamesFromWasmboyStorage(): Promise<
  { cartridgeRom: any; saveStates: any[] }[]
> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open('wasmboy')

    request.onerror = () => reject('Error opening IndexedDB')

    request.onsuccess = (event: Event) => {
      const db: IDBDatabase = (event.target as IDBOpenDBRequest).result
      const transaction: IDBTransaction = db.transaction(['keyval'], 'readonly')
      const store: IDBObjectStore = transaction.objectStore('keyval')
      const getAllRequest: IDBRequest<
        { cartridgeRom: any; saveStates: any[] }[]
      > = store.getAll()

      getAllRequest.onsuccess = () => {
        const allSaves = markRaw(getAllRequest.result)
        resolve(allSaves)
      }

      getAllRequest.onerror = () => reject('Error reading IndexedDB')
    }
  })
}

export async function getLatestGameFromWasmboyStorage(): Promise<
  { cartridgeRom: any } | undefined
> {
  const allSaves = await getAllGamesFromWasmboyStorage()
  return allSaves.length > 0 ? allSaves[allSaves.length - 1] : undefined
}

export function slugify(text: string) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
