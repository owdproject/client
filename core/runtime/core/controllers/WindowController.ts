import {useApplicationManager} from '../../composables/useApplicationManager'
import {useDesktopWindowStore} from '../../stores/storeDesktopWindow'
import {deepClone} from '../../utils/utilsCommon'
import {markRaw} from '@vue/reactivity'
import {defineAsyncComponent} from "vue"

export class WindowController implements IWindowController {
    public readonly application: IApplicationController

    public readonly instanced: boolean = true
    public readonly model: string

    public config: WindowConfig = {
        title: '',
        category: '',

        component: undefined,

        // position
        position: {
            x: 0,
            y: 0,
            z: 0,
        },

        // sizes
        size: {
            width: undefined,
            height: undefined,
        },

        // minimize
        minimizable: true,

        // maximize
        maximized: false,
        maximizable: false,

        // destroy
        destroyable: true,

        // draggable
        draggable: true,

        // resizable
        resizable: true,
    }

    public override: WindowOverride = {}

    public meta: any = {}
    private storedState: WindowStoredState

    constructor(
        application: IApplicationController,
        model: string,
        windowConfig: WindowConfig,
        windowStoredState: WindowStoredState,
    ) {
        this.application = application
        this.model = model

        this.storedState = windowStoredState

        this.setConfig(windowConfig)

        this.restoreState()
    }

    private setConfig(config: WindowConfig) {
        // component
        if (config.component) {
            this.config.component = markRaw(
                defineAsyncComponent(config.component)
            )
        }

        // title
        if (config.title) this.config.title = config.title
        if (config.icon) this.config.icon = config.icon

        // position
        if (!this.config.position) this.config.position = { x: 0, y: 0, z: 0 }
        if (config.position?.x) this.config.position.x = config.position.x
        if (config.position?.y) this.config.position.y = config.position.y
        if (config.position?.z) this.config.position.z = config.position.z

        // sizes
        if (config.size?.width) this.config.size.width = config.size.width
        if (config.size?.height) this.config.size.height = config.size.height
        if (config.size?.minWidth) this.config.size.minWidth = config.size.minWidth
        if (config.size?.minHeight) this.config.size.minHeight = config.size.minHeight
        if (config.size?.maxWidth) this.config.size.maxWidth = config.size.maxWidth
        if (config.size?.maxHeight) this.config.size.maxHeight = config.size.maxHeight

        // minimize
        if (typeof config.minimizable !== 'undefined') {
            this.config.minimizable = config.minimizable
        }
        if (typeof config.maximizable !== 'undefined') {
            this.config.maximizable = config.maximizable
        }

        // maximize
        if (typeof config.maximized !== 'undefined') {
            this.config.maximized = config.maximized
        }

        // draggable
        if (typeof config.draggable !== 'undefined') {
            this.config.draggable = config.draggable
        }

        // resizable
        if (typeof config.resizable !== 'undefined') {
            this.config.resizable = config.resizable
        }

        // destroy
        if (typeof config.destroyable !== 'undefined') {
            this.config.destroyable = config.destroyable
        }

        const DEFAULT_OVERRIDABLE = {
            draggable: true,
            resizable: false,
            position: false,
            size: false,
            maximized: false,
            destroyable: false,
            minimizable: false,
            maximizable: false,
        }

        DEFAULT_OVERRIDABLE.position = DEFAULT_OVERRIDABLE.draggable
        DEFAULT_OVERRIDABLE.size = DEFAULT_OVERRIDABLE.resizable
        DEFAULT_OVERRIDABLE.maximized = DEFAULT_OVERRIDABLE.maximizable

        this.config.overridable = {
            ...DEFAULT_OVERRIDABLE,
            ...(config.overridable || {})
        }
    }

    // state

    get state() {
        return this.storedState.state
    }

    private restoreState() {
        const overridable = this.config.overridable || {}

        for (const key in overridable) {
            if (overridable[key as keyof typeof overridable]) {
                const stateKey = key as keyof WindowState

                if (typeof this.state[stateKey] === 'undefined') {
                    if (typeof this.config[stateKey] === 'object') {
                        this.state[stateKey] = deepClone(this.config[stateKey])
                    } else {
                        this.state[stateKey] = !!this.config[stateKey]
                    }
                }
            }
        }
    }

    // position

    private setPosition(data: { x: number, y: number}) {
        if (!this.state.position) {
            this.state.position = { x: 0, y: 0}
        }

        this.state.position.x = data.x
        this.state.position.y = data.y
    }

    private setActive(value: boolean) {
        this.state.active = value
    }

    private setFocus(value: boolean) {
        this.state.focused = value
    }

    private bringToFront() {
        const applicationManager = useApplicationManager()
        const desktopWindowStore = useDesktopWindowStore()

        if (!this.state.position) {
            this.state.position = { x: 0, y: 0, z: 0 }
        }

        // already focused
        if (this.state.focused) {
            return
        }

        // set focus false on all other windows
        for (const [windowId, window] of applicationManager.windowsOpened) {
            window.actions.setFocus(false)
        }

        this.setFocus(true)

        this.state.position.z = desktopWindowStore.incrementPositionZ()
    }

    // common

    get title(): string {
        if (typeof this.override.title !== 'undefined') {
            return this.override.title
        }

        if (this.config.title) {
            return this.config.title
        }

        return this.application.config.title
    }

    get icon() {
        if (typeof this.override.icon !== 'undefined') {
            return this.override.icon
        }

        if (this.config.icon) {
            return this.config.icon
        }

        return this.application.config.icon
    }

    // position

    get position() {
        if (typeof this.state.position === 'undefined') {
            return this.config.position
        }

        return this.state.position
    }

    // sizes

    get size() {
        const stateSize = this.state.size || {}
        const configSize = this.config.size || {}

        return {
            width: typeof stateSize.width !== 'undefined' ? stateSize.width : configSize.width,
            height: typeof stateSize.height !== 'undefined' ? stateSize.height : configSize.height,
            minWidth: typeof stateSize.minWidth !== 'undefined' ? stateSize.minWidth : configSize.minWidth,
            maxWidth: typeof stateSize.maxWidth !== 'undefined' ? stateSize.maxWidth : configSize.maxWidth,
            minHeight: typeof stateSize.minHeight !== 'undefined' ? stateSize.minHeight : configSize.minHeight,
            maxHeight: typeof stateSize.maxHeight !== 'undefined' ? stateSize.maxHeight : (configSize.maxHeight ?? 600),
        }
    }

    private setSize(data: { width: number, height: number}) {
        if (!this.state.size) {
            this.state.size = { width: undefined, height: undefined }
        }

        this.state.size.width = data.width
        this.state.size.height = data.height
    }

    // minimize

    get isMinimizable() {
        if (this.config.overridable?.minimizable) {
            return !!this.state.minimizable
        }

        return !!this.config.minimizable
    }

    private minimize() {
        if (!this.isMinimizable) {
            return false
        }

        this.state.active = false
        return true
    }

    private toggleMinimize() {
        this.state.active = !this.state.active
        this.bringToFront()
    }

    // maximize

    get isMaximizable() {
        if (typeof this.state.maximizable === 'undefined') {
            return !!this.config.maximizable
        }

        return this.state.maximizable
    }

    get isMaximized() {
        if (this.config.overridable?.maximized) {
            return !!this.state.maximized
        }

        return !!this.config.maximized
    }

    private toggleMaximize() {
        if (!this.isMaximizable) {
            return false
        }

        this.state.maximized = !this.state.maximized
        return true
    }

    private maximize() {
        if (!this.isMaximizable) {
            return false
        }

        this.state.maximized = true
        return true
    }

    private unmaximize() {
        if (!this.isMaximizable) {
            return false
        }

        this.state.maximized = false
        return true
    }

    // destroy

    get isDestroyable() {
        if (this.config.overridable?.destroyable) {
            return !!this.state.destroyable
        }

        return !!this.config.destroyable
    }

    private destroy() {
        if (!this.isDestroyable) {
            return false
        }

        this.application.closeWindow(this.state.id)

        return true
    }

    // draggable
    get isDraggable() {
        if (this.config.overridable?.draggable) {
            return !!this.state.draggable
        }

        return !!this.config.draggable
    }

    // resizable
    get isResizable() {
        if (this.config.overridable?.resizable) {
            return !!this.state.resizable
        }

        return !!this.config.resizable
    }

    // workspace
    private setWorkspace(workspaceId: string) {
        this.state.workspace = workspaceId
    }

    // override

    setTitleOverride(value: undefined|string) {
        this.override.title = value
    }

    resetTitleOverride() {
        this.override.title = undefined
    }

    get actions() {
        return {
            // position
            setActive: this.setActive.bind(this),
            setFocus: this.setFocus.bind(this),
            bringToFront: this.bringToFront.bind(this),
            setPosition: this.setPosition.bind(this),

            // size
            setSize: this.setSize.bind(this),

            // minimize
            minimize: this.minimize.bind(this),
            toggleMinimize: this.toggleMinimize.bind(this),

            // maximize
            toggleMaximize: this.toggleMaximize.bind(this),
            maximize: this.maximize.bind(this),
            unmaximize: this.unmaximize.bind(this),

            // destroy
            destroy: this.destroy.bind(this),

            // workspace
            setWorkspace: this.setWorkspace.bind(this),

            // override
            setTitleOverride: this.setTitleOverride.bind(this),
            resetTitleOverride: this.resetTitleOverride.bind(this),
        }
    }
}