export class WindowController implements IWindowController {
    public readonly applicationController: IApplicationController

    public readonly instanced: boolean = true
    public readonly model: string

    public config: WindowConfig = {
        title: '',
        category: '',
        name: '',

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

        // overflow
        overflow: false,
    }

    public override: WindowOverride = {}

    public meta: any = {}
    private storedState: WindowStoredState

    constructor(
        applicationController: IApplicationController,
        model: string,
        windowConfig: WindowConfig,
        windowStoredState: WindowStoredState,
    ) {
        this.applicationController = applicationController
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
        if (config.name) this.config.name = config.name

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

        // overflow
        if (typeof config.overflow !== 'undefined') {
            this.config.overflow = config.overflow
        }
    }

    // state

    get state() {
        return this.storedState.state
    }

    private restoreState() {
        if (!this.state.pinned) this.state.pinned = this.config.pinned
        if (!this.state.position) this.state.position = deepClone(this.config.position)

        if (!this.state.minimizable) this.state.minimizable = this.config.minimizable
        if (!this.state.maximized) this.state.maximized = this.config.maximized
        if (!this.state.destroyable) this.state.destroyable = this.config.destroyable
        if (!this.state.draggable) this.state.draggable = this.config.draggable
        if (!this.state.resizable) this.state.resizable = this.config.resizable

        if (!this.state.size) {
            this.state.size = deepClone(this.config.size)
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
        if (!this.state.position) {
            this.state.position = { x: 0, y: 0, z: 0 }
        }

        // set focus false on all other windows
        const applicationManager = useApplicationManager()

        for (const [windowId, window] of applicationManager.windowsOpened) {
            window.actions.setFocus(false)
        }

        this.setFocus(true)

        this.state.position.z = Math.ceil((Date.now() -  Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)) / 100)
    }

    // common

    get title() {
        if (typeof this.override.title !== 'undefined') {
            return this.override.title
        }

        return this.config.title
    }

    get icon() {
        if (typeof this.override.icon !== 'undefined') {
            return this.override.icon
        }

        return this.config.icon
    }

    // sizes

    get width() {
        if (typeof this.state.size?.width === 'undefined') {
            return this.config.size.width
        }

        return this.state.size.width
    }

    get maxWidth() {
        if (typeof this.state.size?.maxWidth === 'undefined') {
            return this.config.size.maxWidth
        }

        return this.state.size.maxWidth
    }

    get minWidth() {
        if (typeof this.state.size?.minWidth === 'undefined') {
            return this.config.size.minWidth
        }

        return this.state.size.minWidth
    }

    get height() {
        if (typeof this.state.size?.height === 'undefined') {
            return this.config.size.height
        }

        return this.state.size.height
    }

    get maxHeight() {
        if (typeof this.state.size?.maxHeight === 'undefined') {
            return this.config.size.maxHeight ?? 600
        }

        return this.state.size.maxHeight
    }

    get minHeight() {
        if (typeof this.state.size?.minHeight === 'undefined') {
            return this.config.size.minHeight
        }

        return this.state.size.minHeight
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
        if (typeof this.state.minimizable === 'undefined') {
            return !!this.config.minimizable
        }

        return this.state.minimizable
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
        if (typeof this.state.maximized === 'undefined') {
            return !!this.config.maximized
        }

        return this.state.maximized
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
        return !!this.state.destroyable
    }

    private destroy() {
        if (!this.isDestroyable) {
            return false
        }

        this.applicationController.closeWindow(this.state.id)

        return true
    }

    // draggable
    get isDraggable() {
        return !!this.state.draggable
    }

    // resizable
    get isResizable() {
        return !!this.state.resizable
    }

    // overflow
    get canOverflow() {
        return !!this.config.overflow
    }

    // workspace
    private setWorkspace(workspaceId: string) {
        this.state.workspace = workspaceId
    }

    // override

    setTitleOverride(value: string) {
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