interface IApplicationManager {
    apps: Map<string, IApplicationController>
    appsRunning: Reactive<IApplicationController>

    importApps()

    get appsEntries(): Reactive<ApplicationEntry[]>
    get windowsOpened(): Reactive<IWindowController>
    get appCategories(): string[]
    get appsByCategory(): { [category: string]: IApplicationController[] }

    defineApp(appId: string, config: ApplicationConfig): Promise<IApplicationController>
    closeApp(id: string): void

    execAppCommand(appId: string, command: string): Promise<IApplicationController | undefined>

    isAppDefined(id: string): boolean
    isAppRunning(id: string): boolean
}

type ApplicationCommand = (app: IApplicationController, args: any) => void;

interface ApplicationConfig {
    id: string
    title: string
    icon?: string
    category?: string
    version?: string
    description?: string
    provides?: ApplicationConfigProvide
    singleton?: boolean
    meta?: IApplicationMeta
    permissions?: ApplicationPermission[];
    windows?: { [key: string]: WindowConfig }
    entries: { [key: string]: ApplicationEntry }
    commands?: { [key: string]: ApplicationCommand }

    onReady?(app: IApplicationController): void | Promise<void>
    onLaunch?(app: IApplicationController): void | Promise<void>
    onRestore?(app: IApplicationController): void | Promise<void>
    onClose?(app: IApplicationController): void | Promise<void>
}

interface ApplicationConfigProvide {
    name: string
    entry: string
}

type IApplicationMeta = { [key: string]: any }

interface IApplicationController {
    id: string
    config: ApplicationConfig
    get meta(): { [key: string]: any }
    store: Pinia
    windows: Reactive<Map<string, IWindowController>>

    isRunning: boolean
    setRunning(value: boolean): void

    initApplication(): Promise<void>
    restoreApplication(): Promise<boolean>

    openWindow(model: string, windowStoredState?: WindowStoredState, meta?: {
        isRestoring?: boolean
    })

    closeWindow(windowId: string): void
    closeAllWindows(): void

    get windowsOpened(): Reactive<Map<string, IWindowController>>
}

interface IWindowController {
    application: IApplicationController
    instanced: boolean
    model: string

    config: WindowConfig
    override: WindowOverride
    get state(): WindowState

    // common
    get title(): string
    get icon(): string|undefined

    // sizes
    get width(): WindowSizeValue

    get maxWidth(): WindowSizeValue

    get minWidth(): WindowSizeValue

    get height(): WindowSizeValue

    get maxHeight(): WindowSizeValue

    get minHeight(): WindowSizeValue

    // minimize
    get isMinimizable(): boolean

    // maximize
    get isMaximizable(): boolean

    get isMaximized(): boolean

    // destroy
    get isDestroyable(): boolean

    // draggable
    get isDraggable(): boolean

    // resizable
    get isResizable(): boolean

    get actions(): {
        // position
        setActive(value: boolean)
        setFocus(value: boolean)
        bringToFront()
        setPosition(data: WindowPosition)

        // size
        setSize(data: WindowSize)

        // minimize
        minimize(): boolean

        // maximize
        toggleMaximize(): boolean
        maximize(): boolean
        unmaximize(): boolean

        // destroy
        destroy(): boolean

        // workspace
        setWorkspace(workspaceId: string)

        // override
        setTitleOverride(title: string|undefined): void
        resetTitleOverride(): void
    }
}

interface WindowContent {
    padded?: boolean
    centered?: boolean
}

interface WindowConfig {
    title?: string
    category?: string
    icon?: string
    pinned?: boolean

    component?: Raw<Component>

    // position
    position?: WindowPosition

    // sizes
    size: WindowSize

    // minimize
    minimizable?: boolean

    // maximize
    maximized?: boolean
    maximizable?: boolean

    // destroy
    destroyable?: boolean

    // draggable
    draggable?: boolean

    // draggable
    resizable?: boolean
}

interface WindowStoredState {
    model: string,
    state: WindowState
}

interface WindowOverride {
    title?: undefined|string
    icon?: undefined|string
}

interface WindowState {
    id: string
    createdAt: number

    category?: string
    pinned?: boolean
    workspace: string

    // position
    position?: WindowPosition

    // sizes
    size?: WindowSize

    // focused
    focused: boolean

    // minimize
    active?: boolean
    minimizable?: boolean

    // maximize
    maximized?: boolean
    maximizable?: boolean

    // destroy
    destroyable?: boolean

    // draggable
    draggable?: boolean

    // draggable
    resizable?: boolean
}

interface WindowSize {
    width?: WindowSizeValue
    height?: WindowSizeValue
    minWidth?: WindowSizeValue
    minHeight?: WindowSizeValue
    maxWidth?: WindowSizeValue
    maxHeight?: WindowSizeValue
}

interface WindowPosition {
    x?: number
    y?: number
    z?: number
}

type WindowSizeValue = number|string|undefined

interface ApplicationEntry {
    title?: string
    icon?: string
    category?: string
    command: string | any
}

interface ApplicationEntryWithInherited extends ApplicationEntry {
    application: IApplicationController
}

// DESKTOP

interface IDesktopManager {
    defaultApps: DefaultAppsConfig

    getDefaultApp(feature: string)
    setDefaultApp(feature: string, application: IApplicationController, entry: ApplicationEntry)
}

interface DesktopConfig {
    name: string
    compatibility: string
    defaultApps?: DefaultAppsConfig
    features?: string[]
    systemBar?: DesktopSystemBarConfig
    dockBar?: DesktopDockBarConfig
}

interface DesktopWindowsConfig {
    position: 'relative' | 'absolute' | 'fixed'
}

interface DesktopDockBarConfig {
    enabled?: boolean
    position?: 'top' | 'bottom'
}

interface DesktopSystemBarConfig {
    enabled?: boolean
    position?: 'top' | 'bottom'
    startButton?: boolean
}

// TERMINAL

interface CommandFn {
    fn: (app: IApplicationController, args: string[]) => string | CommandOutput | void
    app: IApplicationController
}

interface CommandOutput {
    text: string
    isError?: boolean
}

// DEFAULT APP

interface DefaultAppsConfig {
    terminal?: DefaultAppConfig
    browser?: DefaultAppConfig
    editor?: DefaultAppConfig
    [key: string]: DefaultAppConfig
}

interface DefaultAppConfig {
    application: IApplicationController
    entry: ApplicationEntry
}