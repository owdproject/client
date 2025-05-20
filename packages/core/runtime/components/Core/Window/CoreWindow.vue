<script setup lang="ts">
import { ref, provide } from 'vue'
import { computed } from '@vue/reactivity'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { handleWindowControllerProps } from '@owdproject/core/runtime/utils/utilWindow'

const props = defineProps<{
  window?: IWindowController
  content?: WindowContent
}>()

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

const desktopManager = useDesktopManager() // used in <style v-bind>
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
    fit-parent
    @drag:start="onWindowDragStart"
    @drag:move="onWindowDragMove"
    @drag:end="onWindowDragEnd"
    @resize:start="onWindowResizeStart"
    @resize:move="onWindowResizeMove"
    @resize:end="onWindowResizeEnd"
    :style="{ zIndex: windowController?.position?.z }"
    :drag-selector="
      windowController?.isDraggable
        ? '.owd-window-nav__draggable'
        : '.owd-window-nav__draggable-none'
    "
    @pointerdown="onWindowPointerDown"
  >
    <slot />
  </vue-resizable>
</template>

<style scoped lang="scss">
.owd-window {
  position: v-bind('desktopManager.config.windows.position');

  &--dragging,
  &--resizing {
    :deep(.owd-window__content) {
      pointer-events: none;
    }
  }

  :deep(.owd-window__content) {
    overflow-y: auto;
    height: 100%;
  }
}
</style>
