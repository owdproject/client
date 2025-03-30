export class ApplicationController implements IApplicationController {
    private readonly applicationManager: IApplicationManager
    private readonly desktopManager: IDesktopManager
    public readonly id
    public readonly config
    private readonly store
    public windows = reactive(new Map<string, IWindowController>())
    public commands = reactive([])

    constructor(
        id: string,
        config: ApplicationConfig
    ) {
        this.applicationManager = useApplicationManager()
        this.desktopManager = useDesktopManager()

        this.id = id
        this.config = config
        this.store = useApplicationState(id)

        this.store.$persistedState.isReady().then(() => {

            // once app is defined, always run "onReady"
            if (typeof this.config.onReady === 'function') {
                this.config.onReady(this)
            }

            // restore application state
            this.restoreApplication()

        })
    }

    /**
     * App has been launched from ApplicationManager
     * perhaps from a desktop application menu
     */
    public async launchApplication() {
        // set default meta values
        this.store.meta = this.config.defaultMeta ?? undefined

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

        if (Object.keys(this.store.windows).length === 0) {
            return false
        }

        this.restoreWindows()

        this.applicationManager.appsRunning.set(this.id, this)

        return true
    }

    private restoreWindows() {
        Object.keys(this.store.windows).map(windowId => {
            const windowStore: WindowStoredState | undefined = this.store.windows[windowId]

            if (windowStore) {
                this.openWindow(windowStore.model, windowStore, { isRestoring: true })
            }
        })

        debugLog('Windows have been restored', this.windows)
    }

    public openWindow(model: string, windowStoredState: WindowStoredState | undefined, meta?: any) {
        const workspaceStore = useWorkspaceStore()

        if (!this.config.windows || !this.config.windows.hasOwnProperty(model)) {
            debugError(`Window model "${model}" not found`)
            return
        }

        let windowId: string

        if (!windowStoredState) {

            windowId = `${model}-${nanoid(6)}`

            this.store.windows[windowId] = {
                model,
                state: {
                    id: windowId,
                    active: true,
                    focused: true,
                    createdAt: +new Date(),
                    workspace: workspaceStore.active
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
