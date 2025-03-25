import type {Reactive} from "@vue/reactivity"

class ApplicationManager implements IApplicationManager {
    public apps = reactive(new Map<string, IApplicationController>())
    public appsRunning = reactive(new Map<string, IApplicationController>())

    constructor() {
    }

    public async importApps() {
        const config = useAppConfig()

        const apps = config.owd.apps ?? []

        await Promise.all(apps.map(async (appName: string) => {
            const appModule = await import(`~~/modules/apps/about`)

            if (appModule.default) {
                const appController: IApplicationController = appModule.default()

                if (appController.config.autoStart || appController.config.alwaysActive) {
                    this.openApp(appName);
                }
            }
        }))
    }

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

        this.apps.set(id, applicationController)

        // restore application state
        if (applicationController.restoreApplication()) {
            this.appsRunning.set(id, applicationController)
        }

        return applicationController
    }

    public openApp(id: string) {
        if (!this.apps.has(id)) {
            debugLog(`App "${id}" is not installed`);
            return
        }

        const applicationController = this.apps.get(id)!

        if (applicationController.config.singleton && this.appsRunning.has(id)) {
            debugLog(`App "${id}" is already opened`);
            return this.appsRunning.get(id);
        }

        this.appsRunning.set(id, applicationController)

        debugLog('App is starting:', applicationController);

        if (typeof applicationController.config.onLaunch === 'function') {
            applicationController.config.onLaunch(applicationController)
        }

        return applicationController;
    }

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

    public get openedWindows() {
        const windows: Reactive<IWindowController[]> = reactive([])

        for (const [appRunningId, appRunning] of this.appsRunning) {
            windows.push(...appRunning.windows)
        }

        windows.sort((a, b) => a.state.createdAt - b.state.createdAt)

        return windows
    }
}

export const applicationManager = new ApplicationManager();
