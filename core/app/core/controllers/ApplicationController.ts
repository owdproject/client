export class ApplicationController implements IApplicationController {
    private readonly applicationManager: IApplicationManager
    public readonly id
    public readonly config
    public readonly store
    public windows = reactive(new Map<string, IWindowController>())
    public commands = reactive([])

    isRunning: boolean = false

    constructor(
        id: string,
        config: ApplicationConfig
    ) {
        this.applicationManager = useApplicationManager()

        this.id = id
        this.config = config
        this.store = useApplicationState(id)
    }

    public async initApplication(): Promise<void> {
        if (this.store.$persistedState) {
            await this.store.$persistedState.isReady()
        }

        // once app is defined, always run "onReady"
        if (typeof this.config.onReady === 'function') {
            this.config.onReady(this)
        }

        // restore application state
        await this.restoreApplication()
    }

    /**
     * App has been launched from ApplicationManager
     * perhaps from a desktop application menu
     */
    public async launchApplication() {
        // set default meta values
        this.store.meta = this.config.meta ?? undefined

        if (typeof this.config.onLaunch === 'function') {
            await this.config.onLaunch(this)
        }

        return true
    }

    /**
     * App always tries to restore previous windows
     * and returns a boolean if it succeeded
     */
    public async restoreApplication() {
        if (typeof this.config.onRestore === 'function') {
            await this.config.onRestore(this)
        }

        if (!this.store.windows || Object.keys(this.store.windows).length === 0) {
            return false
        }

        this.restoreWindows()

        this.setRunning(true)

        return true
    }

    private restoreWindows() {
        Object.keys(this.store.windows).map(windowId => {
            const windowStore: WindowStoredState | undefined = this.store.windows[windowId]

            if (windowStore) {
                this.openWindow(windowStore.model, windowStore, {isRestoring: true})
            }
        })

        debugLog('Windows have been restored', this.windows)
    }

    public openWindow(model: string, windowStoredState: WindowStoredState | undefined, meta?: any) {
        const desktopWorkspaceStore = useDesktopWorkspaceStore()

        if (!this.config.windows || !this.config.windows.hasOwnProperty(model)) {
            debugError(`Window model "${model}" not found`)
            return
        }

        let windowId: string

        if (!windowStoredState) {

            windowId = `${model}-${nanoid(6)}`

            const windowConfig: WindowConfig = this.config.windows[model] as WindowConfig
            const screenHeight = window.innerHeight
            const centerY = (screenHeight - Number(windowConfig.size.height)) / 2
            const positionY = windowConfig.position?.y !== undefined
                ? window.scrollY + windowConfig.position.y
                : window.scrollY + centerY

            this.store.windows[windowId] = {
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
                    workspace: desktopWorkspaceStore.active
                }
            }

            windowStoredState = this.store.windows[windowId]

        } else {

            // restore previous id if state is defined
            windowId = windowStoredState.state.id

        }

        const windowConfig = this.config.windows[model] as WindowConfig

        const windowController = new WindowController(
            this,
            model,
            windowConfig,
            windowStoredState!
        )

        if (!meta?.isRestoring) {
            windowController.actions.bringToFront()
        }

        this.windows.set(
            windowId,
            windowController,
        )

        return windowController
    }

    public closeWindow(windowId: string) {
        delete this.store.windows[windowId];
        this.windows.delete(windowId);

        this.applicationManager.closeApp(this.id)
    }

    public closeAllWindows() {
        this.windows.clear()
    }

    get windowsOpened() {
        return this.windows;
    }

    public setRunning(value: boolean): void {
        this.isRunning = value
    }

    // meta

    get meta() {
        return this.store.meta
    }

    getMeta(key: string) {
        return this.meta[key]
    }

    setMeta(key: string, value: any) {
        this.meta[key] = value
    }
}
