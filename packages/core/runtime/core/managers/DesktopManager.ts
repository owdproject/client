export class DesktopManager {
  private defaultApps: DefaultAppsConfig = {}

  constructor() {}

  get config(): DesktopConfig {
    const runtimeConfig = useRuntimeConfig()

    return runtimeConfig.public.desktop
  }

  public hasFeature(featureName: string) {
    return this.config.features?.indexOf(featureName) !== -1
  }

  public setConfig(config: DesktopConfig) {
    const runtimeConfig = useRuntimeConfig()

    runtimeConfig.public.desktop = deepMerge(
      runtimeConfig.public.desktop,
      config
    ) as DesktopConfig

    this.loadDefaultAppsFromConfig()
  }

  public setDefaultApp(
    feature: string,
    application: IApplicationController,
    command: string,
  ) {
    this.defaultApps[feature] = {
      application,
      command,
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
