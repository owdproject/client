<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Win11ExplorerNavPane from './Win11ExplorerNavPane.vue'
import Win11ExplorerContentPane from './Win11ExplorerContentPane.vue'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()

const { t } = useI18n()

const NAV_WIDTH_STORAGE_KEY = 'owd:win11:explorer:navWidthPx'
const NAV_MIN = 160
const NAV_MAX_FIXED = 640

const mainPaneRef = ref<HTMLElement | null>(null)
const navWidthPx = ref(248)

function maxNavForContainer(): number {
  const el = mainPaneRef.value
  if (!el) return NAV_MAX_FIXED
  const w = el.getBoundingClientRect().width
  return Math.min(NAV_MAX_FIXED, Math.max(NAV_MIN, Math.floor(w * 0.92)))
}

function clampNavWidth(raw: number): number {
  return Math.min(Math.max(NAV_MIN, Math.round(raw)), maxNavForContainer())
}

function readStoredNavWidth(): number {
  if (typeof localStorage === 'undefined') return 248
  const stored = localStorage.getItem(NAV_WIDTH_STORAGE_KEY)
  const n = stored ? Number.parseInt(stored, 10) : NaN
  return Number.isFinite(n) ? n : 248
}

function persistNavWidth() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(NAV_WIDTH_STORAGE_KEY, String(navWidthPx.value))
}

function onMainPaneResize() {
  navWidthPx.value = clampNavWidth(navWidthPx.value)
}

onMounted(() => {
  navWidthPx.value = clampNavWidth(readStoredNavWidth())
  window.addEventListener('resize', onMainPaneResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onMainPaneResize)
})

function onNavSplitterPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  const startX = e.clientX
  const startW = navWidthPx.value

  const onMove = (ev: PointerEvent) => {
    navWidthPx.value = clampNavWidth(startW + (ev.clientX - startX))
  }

  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    persistNavWidth()
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
</script>

<template>
  <div ref="mainPaneRef" class="win11-explorer-main-pane">
    <Win11ExplorerNavPane
      :window="props.window"
      :fs-explorer="props.fsExplorer"
      :width-px="navWidthPx"
    />
    <div
      class="win11-explorer-main-pane__splitter"
      role="separator"
      aria-orientation="vertical"
      :aria-label="t('apps.explorer.nav.resizePane')"
      :aria-valuenow="navWidthPx"
      :aria-valuemin="NAV_MIN"
      :aria-valuemax="maxNavForContainer()"
      tabindex="0"
      @pointerdown="onNavSplitterPointerDown"
    />
    <Win11ExplorerContentPane
      class="win11-explorer-main-pane__content"
      :window="props.window"
      :fs-explorer="props.fsExplorer"
    />
  </div>
</template>

<style scoped lang="scss">
.win11-explorer-main-pane {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.win11-explorer-main-pane__splitter {
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
    background: var(--win11-explorer-pane-divider);
    pointer-events: none;
  }

  &:hover::after,
  &:active::after {
    content: '';
    position: absolute;
    inset: 0;
    background: color-mix(
      in srgb,
      var(--win11-shell-text, #fff) 10%,
      transparent
    );
    pointer-events: none;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--win11-accent, #60cfff) 65%, transparent);
    outline-offset: -1px;
  }
}

.win11-explorer-main-pane__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
</style>
