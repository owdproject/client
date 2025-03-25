interface IApplicationManager {
    apps: Map<string, IApplicationController>
    appsRunning: Map<string, IApplicationController>

    get openedWindows(): Reactive<IWindowController>

    defineApp(id: string, config: ApplicationConfig): IApplicationController
    openApp(id: string): IApplicationController | undefined
    closeApp(id: string): void
}

interface ApplicationConfig {
    id: string
    name: string
    version?: string
    description?: string
    icon?: string
    category?: string
    singleton?: boolean
    autoStart?: boolean
    permissions?: ApplicationPermission[];
    windows?: { [key: string]: WindowConfig }
    commands: { [key: string]: function }
    alwaysActive?: boolean

    onLaunch?(app: IApplicationController): void

    onClose?(app: IApplicationController): void
}

interface IApplicationController {
    id: string
    config: ApplicationConfig
    meta: { [key: string]: any }
    windows: Reactive<Map<string, IWindowController>>
    commands: any

    restoreApplication()

    openWindow(model: string, windowStoredState?: WindowStoredState)

    closeWindow(windowId: string): void

    closeAllWindows(): void

    get openedWindows(): Reactive<Map<string, IWindowController>>
}

interface IWindowController {
    instanced: boolean
    model: string

    config: WindowConfig

    get state(): WindowState

    // sizes
    get width(): number

    get maxWidth(): number

    get minWidth(): number

    get height(): number

    get maxHeight(): number

    get minHeight(): number

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
        // active
        setActive(value: boolean)

        // size
        setSize(data: WindowSize)

        // position
        bringToFront()
        setPosition(data: WindowPosition)

        // minimize
        minimize(): boolean

        // maximize
        toggleMaximize(): boolean
        maximize(): boolean
        unmaximize(): boolean

        // destroy
        destroy(): boolean
    }
}

interface WindowConfig {
    name?: string
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

interface WindowState {
    id: string
    createdAt: number

    title?: string
    category?: string
    icon?: string
    pinned?: boolean
    workspace?: number

    // position
    position?: WindowPosition

    // sizes
    size?: WindowSize

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

    // overflow
    overflow?: boolean
}

interface WindowSize {
    width: number
    height: number
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
}

interface WindowPosition {
    x?: number
    y?: number
    z?: number
}

// DESKTOP

interface DesktopConfig {
    name: string
    compatibility: string
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