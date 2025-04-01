import type {Reactive} from "@vue/reactivity"

export class ApplicationManager implements IApplicationManager {
    public apps = reactive(new Map<string, IApplicationController>())

    private desktopManager: IDesktopManager

    constructor() {
        this.desktopManager = useDesktopManager()
    }

    /**
     * Import applications on nuxt start
     */
    public async importApps() {
        const {owdConfig} = await import(`~~/owd.config`)

        if (owdConfig && typeof owdConfig.loader === 'function') {
            owdConfig.loader()
        }
    }

    /**
     * Define new application
     *
     * @param id
     * @param config
     */
    public async defineApp(id: string, config: ApplicationConfig) {
        if (this.apps.has(id)) {
            return this.apps.get(id)!;
        }

        if (!config.version) config.version = 'unknown'
        if (!config.description) config.description = ''
        if (!config.category) config.category = 'other'

        const applicationConfig = markRaw({
            ...config
        })

        const applicationController: IApplicationController = new ApplicationController(id, applicationConfig)

        // finalize application setup doing async things
        await applicationController.initApplication()

        // set as default app for specific purposes
        // todo improve this and move it in a store
        if (config.provides) {
            const existingDefault = this.desktopManager.getDefaultApp(config.provides)

            if (!existingDefault) {
                this.desktopManager.setDefaultApp(config.provides, id)
                debugLog(`${config.name} has been set as predefined app for "${config.provides}"`)
            }
        }

        // define application
        this.apps.set(id, applicationController)

        return applicationController
    }

    public isAppDefined(id: string) {
        if (!this.apps.has(id)) {
            debugLog(`App "${id}" is not installed`);
            return false
        }

        return true
    }

    public isAppRunning(id: string) {
        const applicationController = this.apps.get(id)

        if (!applicationController) {
            debugLog(`App "${id}" is not defined`);
            return false
        }

        if (!applicationController.isRunning) {
            debugLog(`App "${id}" is not running`);
            return false
        }

        return true
    }

    /**
     * Open application
     *
     * @param id
     */
    public async openApp(id: string) {
        if (!this.isAppDefined(id)) {
            throw Error(`App "${id}" is not installed`);
        }

        const applicationController = this.apps.get(id)!

        await applicationController.launchApplication()

        // todo bring to front latest application window
        if (applicationController.config.singleton && this.isAppRunning(id)) {
            debugLog(`App "${id}" is already opened`);
            return this.apps.get(id);
        }

        applicationController.setRunning(true)

        return applicationController;
    }

    /**
     * Close application
     *
     * @param id
     */
    public closeApp(id: string) {
        const applicationController = this.apps.get(id)

        if (!applicationController) {
            return
        }

        applicationController.closeAllWindows()
        applicationController.setRunning(false)
    }

    /**
     * Array of opened windows for system bars, docks
     */
    public get windowsOpened() {
        const windows: Reactive<Map<string, IWindowController>[]> = reactive([])

        for (const [appId, applicationController] of this.apps) {
            if (applicationController.isRunning) {
                windows.push(...applicationController.windows)
            }
        }

        return windows
    }

    /**
     * Array of opened windows for system bars, docks
     */
    public get appsRunning() {
        const applications: Reactive<IApplicationController[]> = reactive([])

        for (const [appId, applicationController] of this.apps) {
            if (applicationController.isRunning) {
                applications.push(applicationController)
            }
        }

        return applications
    }

    public getWindowOpenedId(windowId: string) {
        const mapWindowFound: Map<string, IWindowController> = this.windowsOpened.find(window => {
            return window[1].state.id === windowId
        })

        if (mapWindowFound) {
            return mapWindowFound[1]
        }
    }

    /**
     * Gets all unique categories from the installed apps
     */
    public get appCategories(): string[] {
        const categories = new Set<string>()
        for (const app of this.apps.values()) {
            if (app.config.category) {
                categories.add(app.config.category)
            }
        }
        return Array.from(categories).sort()
    }

    /**
     * Gets the apps ordered by category
     */
    public get appsByCategory(): { [category: string]: IApplicationController[] } {
        const categorizedApps: { [category: string]: IApplicationController[] } = {}

        for (const app of this.apps.values()) {
            const category = app.config.category || 'other'
            if (!categorizedApps[category]) {
                categorizedApps[category] = []
            }
            categorizedApps[category].push(app)
        }

        for (const category in categorizedApps) {
            categorizedApps[category].sort((a, b) => a.config.name.localeCompare(b.config.name))
        }

        return categorizedApps
    }
}
