import { nanoid } from 'nanoid'
import { WindowController } from './WindowController'
import { useApplicationManager } from '../../composables/useApplicationManager'
import { useApplicationWindowsStore } from '../../stores/storeApplicationWindows'
import { useApplicationMetaStore } from '../../stores/storeApplicationMeta'
import { useTerminalManager } from '../../composables/useTerminalManager'
import { debugLog, debugError } from '../../utils/utilDebug'
import { useDesktopDefaultAppsStore } from '../../stores/storeDesktopDefaultApps'
import { useDesktopWorkspaceStore } from '../../stores/storeDesktopWorkspace'
import { useDesktopWindowStore } from '../../stores/storeDesktopWindow'
import { shallowRef } from 'vue'
import { unref } from 'vue'

export class ApplicationController implements IApplicationController {
  private readonly applicationManager: IApplicationManager
  private readonly terminalManager: ITerminalManager

  public readonly id
  public readonly config
  public readonly storeWindows

  private readonly _windows = shallowRef(new Map<string, IWindowController>())

  /** Reactive window count for Vue (class getters are not tracked). */
  public readonly openWindowCount = shallowRef(0)

  get windows(): Map<string, IWindowController> {
    return this._windows.value
  }

  private replaceWindows(
    mutator: (next: Map<string, IWindowController>) => void,
  ) {
    const next = new Map(this._windows.value)
    mutator(next)
    this._windows.value = next
    this.openWindowCount.value = next.size
  }

  public isRunning = false

  constructor(id: string, config: ApplicationConfig) {
    this.applicationManager = useApplicationManager()
    this.terminalManager = useTerminalManager()

    this.id = id
    this.config = config
    this.storeWindows = useApplicationWindowsStore(id)
  }

  /** Lazy meta store — app modules should register state via `useApplicationMetaStore` before `defineDesktopApp`. */
  get storeMeta() {
    return useApplicationMetaStore(this.id)()
  }

  public async initApplication(): Promise<void> {
    const desktopDefaultAppsStore = useDesktopDefaultAppsStore()

    // provides

    // set as default app for specific purposes
    // todo improve this and move it in a store
    if (this.config.provides) {
      const existingDefault = desktopDefaultAppsStore.getDefaultApp(
        this.config.provides.name,
      )

      if (!existingDefault) {
        desktopDefaultAppsStore.setDefaultApp(
          this.config.provides.name,
          this,
          this.config.provides.entry,
        )

        debugLog(
          `${this.config.title} has been set as predefined app for "${this.config.provides.name}"`,
        )
      }
    }

    // terminal

    if (this.config.commands) {
      for (const commandKey of Object.keys(this.config.commands)) {
        const meta = this.config.terminal?.[commandKey] ?? {}
        this.terminalManager.addCommand({
          applicationId: this.id,
          name: commandKey,
          ...meta,
        })
      }
    }

    // store

    if (this.storeWindows.$persistedState) {
      await this.storeWindows.$persistedState.isReady()
    }

    if (this.storeMeta.$persistedState) {
      await this.storeMeta.$persistedState.isReady()
    }

    // set default meta values
    // this.storeMeta.meta = this.config.meta ?? {}

    // restore application state
    await this.restoreApplication()

    // once app is defined, always run "onReady"
    if (typeof this.config.onReady === 'function') {
      // todo transform in hook
      this.config.onReady(this)
    }
  }

  /**
   * App always tries to restore previous windows
   * and returns a boolean if it succeeded
   */
  public async restoreApplication() {
    if (typeof this.config.onRestore === 'function') {
      // todo transform in hook
      await this.config.onRestore(this)
    }

    if (
      !this.storeWindows.windows ||
      Object.keys(this.storeWindows.windows).length === 0
    ) {
      return false
    }

    this.restoreWindows()

    this.setRunning(true)

    return true
  }

  private restoreWindows() {
    Object.keys(this.storeWindows.windows).map((windowId) => {
      const windowStore: WindowStoredState | undefined =
        this.storeWindows.windows[windowId]

      if (windowStore) {
        this.openWindow(windowStore.model, windowStore, {
          isRestoring: true,
        })
      }
    })

    this.normalizeWindowFocus()

    debugLog('Windows have been restored', this.windows)
  }

  /** Ensure a single focused window after restore or stale persisted state. */
  private normalizeWindowFocus() {
    const allWindows = this.applicationManager?.windowsOpened?.value
      ? Array.from(this.applicationManager.windowsOpened.value.values())
      : Array.from(this.windows.values())

    if (allWindows.length === 0) {
      return
    }

    let topWindow: IWindowController | undefined
    let topZ = -Infinity

    for (const window of allWindows) {
      window.setFocus(false)
      const z = window.state.position?.z ?? 0
      if (z >= topZ) {
        topZ = z
        topWindow = window
      }
    }

    topWindow?.setFocus(true)
  }

  public openWindow(
    model: string,
    windowStoredState: WindowStoredState | undefined,
    meta?: any,
  ) {
    const desktopWorkspaceStore = useDesktopWorkspaceStore()

    if (!this.config.windows || !this.config.windows.hasOwnProperty(model)) {
      debugError(`Window model "${model}" not found`)
      return
    }

    if (!windowStoredState && this.config.singleton) {
      const existing = this.getFirstWindowByModel(model)
      if (existing) {
        if (meta && typeof meta === 'object') {
          Object.assign(existing.meta, meta)
        }
        if (!meta?.isRestoring) {
          existing.actions.setActive(true)
          existing.actions.bringToFront()
        }
        return existing
      }
    }

    let windowId: string

    if (!windowStoredState) {
      windowId = `${model}-${nanoid(6)}`

      const windowConfig: WindowConfig = this.config.windows[
        model
      ] as WindowConfig
      const screenHeight = window.innerHeight
      const configHeight = windowConfig.size?.height
      const layoutHeight =
        typeof configHeight === 'number'
          ? configHeight
          : typeof configHeight === 'string' && /^\d+$/.test(configHeight)
            ? Number(configHeight)
            : 240
      const centerY = (screenHeight - layoutHeight) / 2
      const positionY =
        windowConfig.position?.y !== undefined
          ? window.scrollY + windowConfig.position.y
          : window.scrollY + centerY
      const cascadeStep = 40
      const cascadeOffset = this.getWindowsByModel(model).length * cascadeStep
      const baseX = windowConfig.position?.x ?? 100
      const desktopWindowStore = useDesktopWindowStore()
      const initialZ = desktopWindowStore.incrementPositionZ()

      const nextWindows = {
        ...this.storeWindows.windows,
        [windowId]: {
          model,
          state: {
            id: windowId,
            active: true,
            focused: false,
            position: {
              x: baseX + cascadeOffset,
              y: positionY + cascadeOffset,
              z: initialZ,
            },
            createdAt: +new Date(),
            workspace: desktopWorkspaceStore.resolveActiveWorkspaceId(),
          },
          meta,
        },
      }
      this.storeWindows.windows = nextWindows

      windowStoredState = this.storeWindows.windows[windowId]
    } else {
      // restore previous id if state is defined
      windowId =
        windowStoredState.state?.id ??
        Object.keys(this.storeWindows.windows).find(
          (key) => this.storeWindows.windows[key] === windowStoredState,
        ) ??
        `${model}-restored`
    }

    const windowConfig = this.config.windows[model] as WindowConfig

    const windowController = new WindowController(
      this,
      model,
      windowConfig,
      windowStoredState!,
    )

    if (!meta?.isRestoring) {
      windowController.actions.bringToFront()
    }

    this.replaceWindows((next) => {
      next.set(windowId, windowController)
    })

    this.setRunning(true)

    return windowController
  }

  public closeWindow(windowId: string) {
    if (this.storeWindows.windows[windowId]) {
      const nextWindows = { ...this.storeWindows.windows }
      delete nextWindows[windowId]
      this.storeWindows.windows = nextWindows
    }

    this.replaceWindows((next) => {
      next.delete(windowId)
    })

    if (this.openWindowCount.value === 0) {
      this.applicationManager.closeApp(this.id)
    }
  }

  public closeAllWindows() {
    this.storeWindows.windows = {}
    this._windows.value = new Map()
    this.openWindowCount.value = 0
  }

  get windowsOpened() {
    return this.windows
  }

  public getWindowById(id: string): IWindowController[] {
    return this.windows.get(id)
  }

  public getWindowsByModel(model: string): IWindowController[] {
    return Array.from(this.windows.values()).filter((w) => w.model === model)
  }

  public getFirstWindowByModel(model: string): IWindowController | undefined {
    return Array.from(this.windows.values()).find((w) => w.model === model)
  }

  public setRunning(value: boolean): void {
    this.isRunning = value
  }

  // meta

  get meta() {
    return this.storeMeta.meta
  }

  getMeta(key: string) {
    return this.meta[key]
  }

  setMeta(key: string, value: any) {
    this.meta[key] = value
  }

  // commands

  async execCommand(command: string): Promise<CommandOutput | void> {
    return this.applicationManager.execAppCommand(this.id, command)
  }
}
