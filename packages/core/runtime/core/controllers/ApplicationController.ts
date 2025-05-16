import {nanoid} from "nanoid";
import {WindowController} from "./WindowController";
import {useApplicationManager} from "../../composables/useApplicationManager"
import {useApplicationWindowsStore} from "../../stores/storeApplicationWindows"
import {useApplicationMetaStore} from "../../stores/storeApplicationMeta"
import {useTerminalManager} from "../../composables/useTerminalManager"
import {useDesktopManager} from "../../composables/useDesktopManager"
import {debugLog, debugError} from "../../utils/utilDebug"
import {useDesktopWorkspaceStore} from "../../stores/storeDesktopWorkspace"
import {reactive} from '@vue/reactivity'

export class ApplicationController implements IApplicationController {
    private readonly applicationManager: IApplicationManager
    private readonly desktopManager: IDesktopManager
    private readonly terminalManager: ITerminalManager

    public readonly id
    public readonly config
    public readonly store

    public windows = reactive(new Map<string, IWindowController>())

    public isRunning: boolean = false

    constructor(
        id: string,
        config: ApplicationConfig
    ) {
        this.applicationManager = useApplicationManager()
        this.terminalManager = useTerminalManager()
        this.desktopManager = useDesktopManager()

        this.id = id
        this.config = config
        this.storeWindows = useApplicationWindowsStore(id)
        this.storeMeta = useApplicationMetaStore(id)
    }

    public async initApplication(): Promise<void> {

        // provides

        // set as default app for specific purposes
        // todo improve this and move it in a store
        if (this.config.provides) {
            const existingDefault = this.desktopManager.getDefaultApp(this.config.provides.name)

            if (!existingDefault) {
                this.desktopManager.setDefaultApp(
                    this.config.provides.name,
                    this,
                    this.config.entries[this.config.provides.entry] as ApplicationEntry
                )

                debugLog(`${this.config.title} has been set as predefined app for "${this.config.provides.name}"`)
            }
        }

        // terminal

        if (this.config.commands) {
            for (const commandKey of Object.keys(this.config.commands)) {
                this.terminalManager.addCommand({
                    applicationId: this.id,
                    name: commandKey
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

        if (!this.storeWindows.windows || Object.keys(this.storeWindows.windows).length === 0) {
            return false
        }

        this.restoreWindows()

        this.setRunning(true)

        return true
    }

    private restoreWindows() {
        Object.keys(this.storeWindows.windows).map(windowId => {
            const windowStore: WindowStoredState | undefined = this.storeWindows.windows[windowId]

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

            this.storeWindows.windows[windowId] = {
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
                },
                meta
            }

            windowStoredState = this.storeWindows.windows[windowId]

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

        this.setRunning(true)

        return windowController
    }

    public closeWindow(windowId: string) {
        delete this.storeWindows.windows[windowId];
        this.windows.delete(windowId);

        if (this.windows.size === 0) {
            this.applicationManager.closeApp(this.id)
        }
    }

    public closeAllWindows() {
        this.storeWindows.windows = {}
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
