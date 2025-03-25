export class ApplicationController implements IApplicationController {
    private readonly applicationManager: IApplicationManager
    public readonly id
    public readonly config
    private readonly store
    public meta: { [key: string]: any } = {}
    public windows = reactive(new Map<string, IWindowController>())
    public commands = reactive([])

    constructor(
        manager: IApplicationManager,
        id: string,
        config: ApplicationConfig
    ) {
        this.applicationManager = manager

        this.id = id
        this.config = config
        this.store = useApplicationState(id)
    }

    public restoreApplication() {
        if (
            Object.keys(this.store.meta).length === 0
            && Object.keys(this.store.windows).length === 0
        ) {
            return false
        }

        this.meta = this.store.meta

        this.restoreWindows()

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
                }
            }

            windowStoredState = this.store.windows[windowId]

        } else {

            // restore previous id if state is defined
            windowId = windowStoredState.state.id

        }

        const windowConfig = this.config.windows[model]

        if (!windowConfig) {
            return
        }

        const windowController = new WindowController(
            this,
            model,
            windowConfig,
            windowStoredState!
        )

        if (meta && !meta.isRestoring) {
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

        if (!this.config.alwaysActive && this.windows.size === 0) {
            this.applicationManager.closeApp(this.id)
        }
    }

    public closeAllWindows() {
        this.windows.clear()
    }

    get openedWindows() {
        return this.windows;
    }

    // meta

    getMeta(key: string) {
        return this.meta[key]
    }

    setMeta(key: string, value: any) {
        this.meta[key] = value
    }
}
