// @ts-ignore
import { WasmBoy } from 'wasmboy'
import { useWasmboyLibrary } from './useWasmboyLibrary'
import {
  debugLog,
  debugWarn,
  debugError,
} from '@owdproject/core/runtime/utils/utilDebug'
import { reactive } from '@vue/reactivity'
import {
  wasmboyConfig,
  getLatestGameFromWasmboyStorage,
} from '../utils/utilWasmboy'
import { useWasmboyStore } from 'owd-app-wasmboy//stores/storeWasmboy'

const wasmboyLibrary = useWasmboyLibrary()
const wasmboyStore = useWasmboyStore()

const status = reactive({
  isLoaded: false,
  isPaused: false,
})

let window: IWindowController

export function useWasmboy() {
  const storeWasmboy = useWasmboyStore()

  async function setup(canvas: HTMLCanvasElement, _window: IWindowController) {
    window = _window

    // override wasmboy config
    wasmboyConfig.isGbcColorizationEnabled =
      storeWasmboy.config.isGbcColorizationEnabled
    wasmboyConfig.onPause = () => {
      status.isPaused = true
    }

    await WasmBoy.config(wasmboyConfig, canvas)
  }

  /**
   * Restore latest rom
   */
  async function restorePreviousGame() {
    // wait until store has been restored
    if (wasmboyStore.$persistedState) {
      await wasmboyStore.$persistedState.isReady()
    }

    const latestGame = await getLatestGameFromWasmboyStorage()

    if (!latestGame || !latestGame.cartridgeRom) {
      return
    }

    await loadGame(latestGame.cartridgeRom)
  }

  /**
   * Restore latest save-game of current rom
   */
  async function restoreGameState(gameState?: WasmboySaveState) {
    try {
      if (gameState) {
        await loadGameState(gameState)
      } else {
        const saves: WasmboySaveState[] = await WasmBoy.getSaveStates()

        if (saves && saves.length > 0) {
          await loadGameState(saves[saves.length - 1])
        } else {
          console.log('No save-game found')
        }
      }
    } catch (error) {
      debugError('Error loading game:', error)
    }

    if (!wasmboyStore.config.isPausedByPlayer) {
      await playEmulator()
    }
  }

  /**
   * Load save-game
   *
   * @param saveState
   */
  async function loadGameState(saveState: WasmboySaveState) {
    await WasmBoy.pause()
    await WasmBoy.loadState(saveState)
  }

  /**
   * Save and return save-game
   */
  async function saveGameState() {
    try {
      const gameSave = await WasmBoy.saveState()

      await pauseEmulator()

      return gameSave
    } catch (error) {
      debugError('Error saving the game:', error)
    }
  }

  /**
   * Load game
   *
   * @param cartridgeRom
   */
  async function loadGame(cartridgeRom: WasmboyGameCardridge) {
    try {
      await WasmBoy.loadROM(cartridgeRom.ROM, {
        header: cartridgeRom.header,
        fileName: cartridgeRom.fileName,
      })

      debugWarn(storeWasmboy.config)

      setSpeed(storeWasmboy.config.speed)

      await restoreGameState()

      status.isLoaded = true

      const cartridgeInfo = await WasmBoy._getCartridgeInfo()

      await wasmboyLibrary.setCurrentGameKey(cartridgeInfo.header)
      setWindowNameAsGameTitle()

      debugLog('Cartridge ROM loaded into WasmBoy')
    } catch (error) {
      debugError('Error loading the ROM:', error)
    }
  }

  /**
   * Load new game from input[type=file]
   *
   * @param file
   */
  async function insertCartridge(file: File) {
    try {
      await loadGame({
        ROM: file,
        header: undefined,
        fileName: file.name,
      })
      await WasmBoy.saveLoadedCartridge()

      // refresh library
      await useWasmboyLibrary().refreshGameList()
    } catch (error) {
      debugError('Error initializing new ROM:', error)
    }
  }

  /**
   * Play WasmBoy
   */
  async function playEmulator() {
    await WasmBoy.play()
    status.isPaused = false
    storeWasmboy.config.isPausedByPlayer = false
  }

  /**
   * Pause WasmBoy
   */
  async function pauseEmulator() {
    await WasmBoy.pause()
    status.isPaused = true
    storeWasmboy.config.isPausedByPlayer = true
  }

  /**
   * Reset WasmBoy
   */
  async function resetEmulator() {
    await WasmBoy.reset()
  }

  /**
   * Toggle play
   */
  async function togglePlayEmulator() {
    if (status.isPaused) {
      await playEmulator()
    } else {
      await pauseEmulator()
    }
  }

  /**
   * Set emulator speed
   */
  function setSpeed(speed: number) {
    WasmBoy.setSpeed(speed)
    storeWasmboy.config.speed = speed
  }

  function setWindowNameAsGameTitle() {
    function filterValidChars(input: string): string {
      return input.replace(/[^a-zA-Z0-9\s.,!?()\-]/g, '')
    }

    if (!storeWasmboy.config.gameTitleAsWindowName) {
      return
    }

    window.actions.setTitleOverride(
      filterValidChars(
        wasmboyLibrary.currentGame.value
          ? wasmboyLibrary.currentGame.value.cartridgeInfo.titleAsString
          : undefined,
      ),
    )
  }

  return {
    status,
    setup,
    restorePreviousGame,
    restoreGameState,
    saveGameState,
    loadGame,
    insertCartridge,
    setSpeed,
    playEmulator,
    pauseEmulator,
    resetEmulator,
    togglePlayEmulator,
  }
}
