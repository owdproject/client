export class DesktopManager {
    public config: DesktopConfig = {} as DesktopConfig

    constructor() {

    }

    public setConfig(config: DesktopConfig) {
        this.config = config
    }

    public overrideConfig(config: Partial<DesktopConfig>) {
        this.config = deepMerge(this.config, config)
    }
}
