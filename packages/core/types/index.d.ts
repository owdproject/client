import type { Nuxt } from '@nuxt/schema';
import { useApplicationManager } from '../runtime/composables/useApplicationManager';

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    owd: {
      tailwindPaths: []
    };
  }
}

interface IApplicationManager {
    apps: Map<string, IApplicationController>

    get appsEntries(): Reactive<ApplicationEntry[]>

    get appsRunning(): Reactive<IApplicationController[]>

    get windowsOpened(): Reactive<IWindowController[]>

    get appCategories(): string[]

    get appsByCategory(): { [category: string]: IApplicationController[] }

    defineApp(id: string, config: ApplicationConfig): Promise<IApplicationController>

    closeApp(id: string): void

    launchAppEntry(id: string, entry: string): Promise<IApplicationController | undefined | void>
    execAppCommand(id: string, command: string, meta: undefined | any): Promise<CommandOutput | void>

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

    getWindowsByModel(model: string): IWindowController[]

    getFirstWindowByModel(model: string): IWindowController | undefined

    openWindow(model: string, windowStoredState?: WindowStoredState, options?: {
        isRestoring?: boolean
    })

    closeWindow(windowId: string): void

    closeAllWindows(): void

    execCommand(command: string): Promise<CommandOutput | void>

    // deprecated
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

    get icon(): string | undefined

    // sizes
    get size(): WindowSize

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
        setTitleOverride(title: string | undefined): void
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

    overridable?: Partial<Record<'position' | 'size' | 'maximized' | 'draggable' | 'resizable' | 'destroyable' | 'minimizable', boolean>>
}

interface WindowStoredState {
    model: string,
    state: WindowState
    meta: any
}

interface WindowOverride {
    title?: undefined | string
    icon?: undefined | string
}

interface WindowState {
    id: string
    createdAt: number

    category?: string
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

type WindowSizeValue = number | string | undefined

interface ApplicationEntry {
    title?: string
    icon?: string
    category?: string
    visibility?: ApplicationEntryVisibility
    command: string | any
}


interface ApplicationEntryWithInherited extends ApplicationEntry {
    application: IApplicationController
    visibility: ApplicationEntryVisibility
}

type ApplicationEntryVisibility = 'primary' | 'secondary' | 'hidden'

// DESKTOP

interface IDesktopManager {
    defaultApps: DefaultAppsConfig

    getDefaultApp(feature: string)

    setDefaultApp(feature: string, application: IApplicationController, entry: ApplicationEntry)
}

interface DesktopConfig {
    theme?: string
    modules?: string[]
    apps?: string[]

    name?: string
    defaultApps?: DefaultAppsConfig
    features?: string[]

    systemBar?: DesktopSystemBarConfig
    dockBar?: DesktopDockBarConfig
    workspaces?: DesktopWorkspacesConfig
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

interface DesktopWorkspacesConfig {
    enabled?: boolean
}

// TERMINAL

type TerminalCommand = {
    name: string
    applicationId: string
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

export function defineDesktopApp(config: ApplicationConfig)
export function defineDesktopConfig(config: DesktopConfig)
export function registerTailwindPath(nuxt: Nuxt, path: string): void;

export {}
