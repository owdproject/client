import type {Reactive} from "@vue/reactivity"

export class ApplicationManager implements IApplicationManager {
    public apps = reactive(new Map<string, IApplicationController>())
    public appsRunning = reactive(new Map<string, IApplicationController>())

    private desktopManager: IDesktopManager

    constructor() {
        this.desktopManager = useDesktopManager()
    }

    /**
     * Import applications on nuxt start
     */
    public async importApps() {
        const { owdConfig } = await import(`~~/owd.config`)

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
    public defineApp(id: string, config: ApplicationConfig) {
        if (this.apps.has(id)) {
            return this.apps.get(id)!;
        }

        if (!config.version) config.version = 'unknown'
        if (!config.description) config.description = ''
        if (!config.category) config.category = 'other'

        const applicationConfig = markRaw({
            ...config
        })

        const applicationController: IApplicationController = new ApplicationController(this, id, applicationConfig)

        // define application
        this.apps.set(id, applicationController)

        // set as default app for specific purposes
        if (config.provides) {
            const existingDefault = this.desktopManager.getDefaultApp(config.provides)
            const appsForFeature = Array.from(this.apps.values()).filter(app => app.config.provides === config.provides)

            if (!existingDefault && appsForFeature.length === 1) {
                this.desktopManager.setDefaultApp(config.provides, id)
                debugLog(`${config.name} has been set as predefined app for "${config.provides}"`)
            }
        }

        // start application
        if (applicationController.config.autoStart || applicationController.config.alwaysActive) {
            this.openApp(id);
        }

        // restore application state
        if (applicationController.restoreApplication()) {
            this.appsRunning.set(id, applicationController)
        }

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
        if (!this.appsRunning.has(id)) {
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

        if (applicationController.config.singleton && this.isAppRunning(id)) {
            debugLog(`App "${id}" is already opened`);

            // todo bring to front latest application window

            return this.appsRunning.get(id);
        }

        this.appsRunning.set(id, applicationController)

        await applicationController.launchApplication(applicationController)

        return applicationController;
    }

    /**
     * Close application
     *
     * @param id
     */
    public closeApp(id: string) {
        const applicationController = this.appsRunning.get(id);
        if (!applicationController) return;

        applicationController.closeAllWindows();

        if (!applicationController.config.alwaysActive) {
            this.appsRunning.delete(id);
        } else {
            debugLog(`App "${id}" always stay in background`);
        }
    }

    /**
     * Array of opened windows for system bars, docks
     */
    public get windowsOpened() {
        const windows: Reactive<Map<string,IWindowController>[]> = reactive([])

        for (const [appRunningId, appRunning] of this.appsRunning) {
            windows.push(...appRunning.windows)
        }

        return windows
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
