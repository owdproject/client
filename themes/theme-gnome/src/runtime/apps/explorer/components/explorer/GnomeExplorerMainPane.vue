<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { ref, watch } from 'vue'
import {
  useEventListener,
  useLocalStorage,
  useResizeObserver,
} from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import GnomeExplorerNavPane from './GnomeExplorerNavPane.vue'
import GnomeExplorerContentPane from './GnomeExplorerContentPane.vue'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()

const { t } = useI18n()

const NAV_WIDTH_STORAGE_KEY = 'owd:gnome:explorer:navWidthPx'
const NAV_MIN = 160
const NAV_MAX_FIXED = 640

const mainPaneRef = ref<HTMLElement | null>(null)
const storedNavWidth = useLocalStorage(NAV_WIDTH_STORAGE_KEY, 248)

function maxNavForContainer(): number {
  const el = mainPaneRef.value
  if (!el) return NAV_MAX_FIXED
  const w = el.getBoundingClientRect().width
  return Math.min(NAV_MAX_FIXED, Math.max(NAV_MIN, Math.floor(w * 0.92)))
}

function clampNavWidth(raw: number): number {
  return Math.min(Math.max(NAV_MIN, Math.round(raw)), maxNavForContainer())
}

const navWidthPx = ref(clampNavWidth(storedNavWidth.value))

watch(navWidthPx, (v) => {
  storedNavWidth.value = v
})

useResizeObserver(mainPaneRef, () => {
  navWidthPx.value = clampNavWidth(navWidthPx.value)
})

useEventListener(window, 'resize', () => {
  navWidthPx.value = clampNavWidth(navWidthPx.value)
})

function onNavSplitterPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  const startX = e.clientX
  const startW = navWidthPx.value

  const stopMove = useEventListener(document, 'pointermove', (ev: PointerEvent) => {
    navWidthPx.value = clampNavWidth(startW + (ev.clientX - startX))
  })

  const stopDrag = useEventListener(
    document,
    'pointerup',
    () => {
      stopDrag()
      stopMove()
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    },
    { once: true },
  )

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
</script>

<template>
  <div ref="mainPaneRef" class="gnome-explorer-main-pane">
    <GnomeExplorerNavPane
      :window="props.window"
      :fs-explorer="props.fsExplorer"
      :width-px="navWidthPx"
    />
    <div
      class="gnome-explorer-main-pane__splitter"
      role="separator"
      aria-orientation="vertical"
      :aria-label="t('apps.explorer.nav.resizePane')"
      :aria-valuenow="navWidthPx"
      :aria-valuemin="NAV_MIN"
      :aria-valuemax="maxNavForContainer()"
      tabindex="0"
      @pointerdown="onNavSplitterPointerDown"
    />
    <GnomeExplorerContentPane
      class="gnome-explorer-main-pane__content"
      :window="props.window"
      :fs-explorer="props.fsExplorer"
    />
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-main-pane {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.gnome-explorer-main-pane__splitter {
  flex: 0 0 6px;
  width: 6px;
  min-width: 6px;
  cursor: col-resize;
  touch-action: none;
  position: relative;
  z-index: 2;
  margin-left: -1px;
  align-self: stretch;
  background: transparent;

  &::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--gnome-explorer-pane-divider);
    pointer-events: none;
  }

  &:hover::after,
  &:active::after {
    content: '';
    position: absolute;
    inset: 0;
    background: color-mix(
      in srgb,
      var(--gnome-explorer-fg, #fff) 10%,
      transparent
    );
    pointer-events: none;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--gnome-explorer-accent, #3584e4) 65%, transparent);
    outline-offset: -1px;
  }
}

.gnome-explorer-main-pane__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
