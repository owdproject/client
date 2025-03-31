export class DesktopManager {
    public config: DesktopConfig = {} as DesktopConfig
    private defaultApps: DefaultAppsConfig = {}

    constructor() {

    }

    public hasFeature(featureName: string) {
        return this.config.features?.indexOf(featureName) !== -1
    }

    public setConfig(config: DesktopConfig) {
        this.config = config
        this.loadDefaultAppsFromConfig()
    }

    public overrideConfig(config: Partial<DesktopConfig>) {
        this.config = deepMerge(this.config, config) as DesktopConfig
        this.loadDefaultAppsFromConfig()
    }

    public setDefaultApp(feature: string, appId: string) {
        this.defaultApps[feature] = appId
    }

    public getDefaultApp(feature: string): string | undefined {
        return this.defaultApps[feature]
    }

    private loadDefaultAppsFromConfig() {
        if (this.config.defaultApps) {
            this.defaultApps = { ...this.config.defaultApps }
        }
    }
}