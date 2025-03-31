interface IApplicationManager {
    apps: Map<string, IApplicationController>
    appsRunning: Reactive<IApplicationController>

    importApps()

    get windowsOpened(): Reactive<IWindowController>
    get appCategories(): string[]
    get appsByCategory(): { [category: string]: IApplicationController[] }

    defineApp(id: string, config: ApplicationConfig): IApplicationController
    openApp(id: string): Promise<IApplicationController | undefined>
    closeApp(id: string): void

    isAppDefined(id: string): boolean
    isAppRunning(id: string): boolean
}

type CommandFunction = (app: IApplicationController, args: any) => void;

interface ApplicationConfig {
    id: string
    name: string
    version?: string
    description?: string
    icon?: string
    category?: string
    provides?: string
    singleton?: boolean
    defaultMeta?: IApplicationMeta
    permissions?: ApplicationPermission[];
    windows?: { [key: string]: WindowConfig }
    commands?: { [key: string]: CommandFunction }

    onReady?(app: IApplicationController): void | Promise<void>
    onLaunch?(app: IApplicationController): void | Promise<void>
    onRestore?(app: IApplicationController): void | Promise<void>
    onClose?(app: IApplicationController): void | Promise<void>
}

type IApplicationMeta = { [key: string]: any }

interface IApplicationController {
    id: string
    config: ApplicationConfig
    get meta(): { [key: string]: any }
    store: Pinia
    windows: Reactive<Map<string, IWindowController>>
    commands: any

    isRunning: boolean
    setRunning(value: boolean): void

    launchApplication(): Promise<boolean>
    restoreApplication(): Promise<boolean>

    openWindow(model: string, windowStoredState?: WindowStoredState, meta?: {
        isRestoring?: boolean
    })

    closeWindow(windowId: string): void

    closeAllWindows(): void

    get windowsOpened(): Reactive<Map<string, IWindowController>>
}

interface IWindowController {
    applicationController: IApplicationController
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

    // overflow
    get canOverflow(): WindowOverflow

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

interface WindowConfig {
    name: string
    title: string
    category: string
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

    // overflow
    overflow?: boolean
}

/*
interface ApplicationStoredState {
  meta: any
  windows: WindowStoredState[]
}
 */

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
    width: WindowSizeValue
    height: WindowSizeValue
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

// DESKTOP

interface IDesktopManager {

}

interface DesktopConfig {
    name: string
    compatibility: string
    features?: string[]
    systemBar?: SystemBarConfig
    dockBar?: DockBarConfig
}

interface DockBarConfig {
    enabled?: boolean
    position?: 'top' | 'bottom'
}

interface SystemBarConfig {
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
    terminal?: string
    browser?: string
    editor?: string
    [key: string]: string | undefined
}