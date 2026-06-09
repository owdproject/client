<script setup lang="ts">
import { ref, provide } from 'vue'
import { computed } from '@vue/reactivity'
import { useAppConfig } from 'nuxt/app'
import { handleWindowControllerProps } from '../../../utils/utilWindowControllerAdapter'
import { useDesktopWorkspaceStore } from '../../../stores/storeDesktopWorkspace'

const props = defineProps<{
  window?: IWindowController
  content?: WindowContent
}>()

const desktopWorkspaceStore = useDesktopWorkspaceStore()

const emit = defineEmits([
  'resize:start',
  'resize:move',
  'resize:end',
  'drag:start',
  'drag:move',
  'drag:end',
  'close',
  'open',
  'blur',
  'focus',
  'minimize',
  'restore',
  'maximize',
  'unmaximize',
  'toggle-maximize',
])

const appConfig = useAppConfig()
const windowController: IWindowController = handleWindowControllerProps(
  props.window,
)

provide<IWindowController>('windowController', windowController)
provide<WindowContent>('windowContent', props.content ?? {})

const isDragging = ref(false)
const isResizing = ref(false)

function onWindowPointerDown() {
  windowController?.actions?.setActive(true)
  windowController?.actions?.bringToFront()
}

function onWindowDragStart(data: any) {
  isDragging.value = true

  emit('drag:start', data)
}

function onWindowDragMove(data: any) {
  emit('drag:move', data)
}

function onWindowDragEnd(data: { left: number; top: number }) {
  windowController?.actions?.setPosition({
    x: data.left,
    y: data.top,
  })

  isDragging.value = false

  emit('drag:end', data)
}

function onWindowResizeStart(data: any) {
  isResizing.value = true

  emit('resize:start', data)
}

function onWindowResizeMove(data: any) {
  emit('resize:move', data)
}

/**
 * Window end resize event
 */
function onWindowResizeEnd(data: {
  left: number
  top: number
  width: number
  height: number
}) {
  isResizing.value = false

  windowController?.actions?.setPosition({
    x: data.left,
    y: data.top,
  })

  windowController?.actions?.setSize({
    width: data.width,
    height: data.height,
  })

  emit('resize:end', data)
}

const classes = computed(() => {
  const list = ['owd-window']

  if (windowController?.state.focused) {
    list.push('owd-window--focused')
  }

  if (isDragging.value) {
    list.push('owd-window--dragging')
  }

  if (isResizing.value) {
    list.push('owd-window--resizing')
  }

  return list
})

/** While workspace overview is open, disable vue-resizable chrome drag and use native HTML5 drag to move windows between desktops. */
const workspaceChromeDragSelector = computed(() => {
  if (desktopWorkspaceStore.overview) {
    return '.owd-window-overview-drag-none'
  }
  return windowController?.isDraggable
    ? '.owd-window-nav__draggable'
    : '.owd-window-nav__draggable-none'
})

function onOverviewNativeDragStart(e: DragEvent) {
  if (!desktopWorkspaceStore.overview || !windowController) return
  e.stopPropagation()
  e.dataTransfer?.setData('text/plain', windowController.state.id)
  e.dataTransfer!.effectAllowed = 'move'
  try {
    const img = new Image()
    img.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer?.setDragImage(img, 0, 0)
  } catch {
    /* noop */
  }
}

const windowPositionMode = computed(
  () => appConfig.desktop?.windows?.position ?? 'fixed',
)

/** `fit-parent` clamps drag/resize to the parent box — wrong for viewport-fixed shells (Win11, GNOME). */
const shouldFitParent = computed(
  () => windowPositionMode.value !== 'fixed',
)
</script>

<template>
  <vue-resizable
    ref="windowResizableController"
    :class="classes"
    :width="windowController?.size.width"
    :height="windowController?.size.height"
    :min-width="windowController?.size.minWidth"
    :min-height="windowController?.size.minHeight"
    :max-width="windowController?.size.maxWidth"
    :max-height="windowController?.size.maxHeight"
    :left="windowController?.position?.x"
    :top="windowController?.position?.y"
    :active="windowController?.isResizable ? undefined : []"
    :fit-parent="shouldFitParent"
    @drag:start="onWindowDragStart"
    @drag:move="onWindowDragMove"
    @drag:end="onWindowDragEnd"
    @resize:start="onWindowResizeStart"
    @resize:move="onWindowResizeMove"
    @resize:end="onWindowResizeEnd"
    :style="{ zIndex: windowController?.position?.z }"
    :drag-selector="workspaceChromeDragSelector"
    :draggable="desktopWorkspaceStore.overview"
    @pointerdown="onWindowPointerDown"
    @dragstart="onOverviewNativeDragStart"
  >
    <slot />
  </vue-resizable>
</template>

<style scoped lang="scss">
/* vue-resizable sets `.resizable-component { position: relative }` — override so desktop geometry stays consistent */
.owd-window.resizable-component {
  position: v-bind('windowPositionMode') !important;
}

.owd-window {
  position: v-bind('windowPositionMode');

  &--dragging,
  &--resizing {
    :deep(.owd-window__content) {
      pointer-events: none;
    }
  }

  :deep(.owd-window__content) {
    overflow-y: auto;
    height: 100%;
    min-height: 0;
  }
}
</style>
