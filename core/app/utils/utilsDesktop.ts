export function defineDesktopApp(config: ApplicationConfig) {
    const applicationManager = useApplicationManager()
    return applicationManager.defineApp(config.id, config)
}

export function defineDesktopConfig(config: DesktopConfig) {
    const desktopManager = useDesktopManager()
    desktopManager.setConfig(config)
}