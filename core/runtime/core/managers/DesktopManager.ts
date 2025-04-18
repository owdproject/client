import {deepMerge} from "../../utils/utilsCommon"

export class DesktopManager {
    public config: DesktopConfig = {} as DesktopConfig
    private defaultApps: DefaultAppsConfig = {}

    constructor() {

    }

    public hasFeature(featureName: string) {
        return this.config.features?.indexOf(featureName) !== -1
    }

    public setConfig(config: DesktopConfig) {
        this.config = deepMerge(this.config, config) as DesktopConfig
        this.loadDefaultAppsFromConfig()
    }

    public setDefaultApp(feature: string, application: IApplicationController, entry: ApplicationEntry) {
        this.defaultApps[feature] = {
            application,
            entry
        }
    }

    public getDefaultApp(feature: string): DefaultAppConfig {
        return this.defaultApps[feature] as DefaultAppConfig
    }

    private loadDefaultAppsFromConfig() {
        if (this.config.defaultApps) {
            this.defaultApps = { ...this.config.defaultApps }
        }
    }
}