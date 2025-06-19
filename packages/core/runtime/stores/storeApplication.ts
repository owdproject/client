// actually unused

import { defineStore } from 'pinia'
import { reactive, ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import { WindowController } from '../core/controllers/WindowController'
import { useApplicationManager } from '../composables/useApplicationManager'
import { useApplicationWindowsStore } from './storeApplicationWindows'
import { useApplicationMetaStore } from './storeApplicationMeta'
import { useTerminalManager } from '../composables/useTerminalManager'
import { useDesktopManager } from '../composables/useDesktopManager'
import { useDesktopWorkspaceStore } from './storeDesktopWorkspace'
import { debugLog, debugError } from '../utils/utilDebug'

interface WindowStoredState {
  model: string
  state: any
  meta?: any
}

export const useApplicationStore = function(applicationId: string, applicationConfig: ApplicationConfig) {
  return defineStore(`owd/application/${applicationId}`, () => {
    // reactive state
    const windows = reactive(new Map<string, WindowController>())
    const isRunning = ref<boolean>(false)

    // composables and external stores
    const applicationManager = useApplicationManager()
    const terminalManager = useTerminalManager()
    const desktopManager = useDesktopManager()
    const desktopWorkspaceStore = useDesktopWorkspaceStore()

    let storeWindows: ReturnType<typeof useApplicationWindowsStore>
    let storeMeta: ReturnType<typeof useApplicationMetaStore>

    // init application
    async function initApplication() {
      storeWindows = useApplicationWindowsStore(applicationId)
      storeMeta = useApplicationMetaStore(applicationId)

      // set default app
      if (applicationConfig.provides) {
        const existingDefault = desktopManager.getDefaultApp(
          applicationConfig.provides.name,
        )
        if (!existingDefault) {
          desktopManager.setDefaultApp(
            applicationConfig.provides.name,
            store, // store o qualcosa che rappresenta questa app?
            applicationConfig.entries![applicationConfig.provides.entry]!,
          )
          debugLog(
            `${applicationConfig.title} set as predefined app for "${applicationConfig.provides.name}"`,
          )
        }
      }

      // register terminal commands
      if (applicationConfig.commands) {
        for (const commandKey of Object.keys(applicationConfig.commands)) {
          terminalManager.addCommand({
            applicationId,
            name: commandKey,
          })
        }
      }

      if (storeWindows.$persistedState) await storeWindows.$persistedState.isReady()
      if (storeMeta.$persistedState) await storeMeta.$persistedState.isReady()

      await restoreApplication()

      if (typeof applicationConfig.onReady === 'function') {
        applicationConfig.onReady(store)
      }
    }

    // restore
    async function restoreApplication() {
      if (typeof applicationConfig.onRestore === 'function') {
        await applicationConfig.onRestore(store)
      }

      if (!storeWindows.windows || Object.keys(storeWindows.windows).length === 0) {
        return false
      }

      restoreWindows()
      setRunning(true)
      return true
    }

    function restoreWindows() {
      Object.keys(storeWindows.windows).forEach((windowId) => {
        const windowStore = storeWindows.windows[windowId]
        if (windowStore) {
          openWindow(windowStore.model, windowStore, { isRestoring: true })
        }
      })
      debugLog('Windows restored', windows)
    }

    // open window
    function openWindow(
      model: string,
      windowStoredState?: WindowStoredState,
      meta?: any,
    ): WindowController | undefined {
      if (!applicationConfig.windows || !applicationConfig.windows.hasOwnProperty(model)) {
        debugError(`Window model "${model}" not found`)
        return
      }

      let windowId: string

      if (!windowStoredState) {
        windowId = `${model}-${nanoid(6)}`
        const windowConfig = applicationConfig.windows[model] as WindowConfig
        const screenHeight = window.innerHeight
        const centerY = (screenHeight - Number(windowConfig.size.height)) / 2
        const positionY =
          windowConfig.position?.y !== undefined
            ? window.scrollY + windowConfig.position.y
            : window.scrollY + centerY

        storeWindows.windows[windowId] = {
          model,
          state: {
            id: windowId,
            active: true,
            focused: false,
            position: {
              x: windowConfig.position?.x,
              y: positionY,
            },
            createdAt: +new Date(),
            workspace: desktopWorkspaceStore.active,
          },
          meta,
        }

        windowStoredState = storeWindows.windows[windowId]
      } else {
        windowId = windowStoredState.state.id
      }

      const windowConfig = applicationConfig.windows[model] as WindowConfig
      const windowController = new WindowController(store, model, windowConfig, windowStoredState!)

      if (!meta?.isRestoring) {
        windowController.actions.bringToFront()
      }

      windows.set(windowId, windowController)
      setRunning(true)

      return windowController
    }

    // close window
    function closeWindow(windowId: string) {
      delete storeWindows.windows[windowId]
      windows.delete(windowId)

      if (windows.size === 0) {
        applicationManager.closeApp(applicationId)
      }
    }

    // close all windows
    function closeAllWindows() {
      storeWindows.windows = {}
      windows.clear()
    }

    // getters
    const windowsOpened = computed(() => windows)

    function getWindowById(id: string) {
      return windows.get(id)
    }

    function getWindowsByModel(model: string) {
      return Array.from(windows.values()).filter((w) => w.model === model)
    }

    function getFirstWindowByModel(model: string) {
      return Array.from(windows.values()).find((w) => w.model === model)
    }

    function setRunning(value: boolean) {
      isRunning.value = value
    }

    // meta management
    const meta = computed(() => storeMeta.meta)

    function getMeta(key: string) {
      return meta.value[key]
    }

    function setMeta(key: string, value: any) {
      storeMeta.meta[key] = value
    }

    // command exec
    async function execCommand(command: string) {
      return applicationManager.execAppCommand(applicationId, command)
    }

    const store = {
      id: applicationId,
      config: applicationConfig,
      storeWindows,
      storeMeta,
      windows,
      isRunning,
      initApplication,
      restoreApplication,
      openWindow,
      closeWindow,
      closeAllWindows,
      windowsOpened,
      getWindowById,
      getWindowsByModel,
      getFirstWindowByModel,
      setRunning,
      meta,
      getMeta,
      setMeta,
      execCommand,
    }

    return store
  })()
}
