import type { DesktopWorkAreaRect } from '@owdproject/core'
import type { Ref } from 'vue'
import { onScopeDispose, readonly, shallowRef, watch } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

const EMPTY_WORK_AREA: DesktopWorkAreaRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

function measureElement(el: HTMLElement): DesktopWorkAreaRect {
  const rect = el.getBoundingClientRect()
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * Tracks the desktop shell stage rectangle (area under system bar, above dock).
 * Pass the same ref themes use for workspace overview live scale.
 */
export function useDesktopWorkArea(
  shellStageRef: Ref<HTMLElement | null | undefined>,
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const workArea = shallowRef<DesktopWorkAreaRect>({ ...EMPTY_WORK_AREA })

  let resizeObserver: ResizeObserver | null = null

  function refreshWorkArea() {
    const el = shellStageRef.value
    if (!el) {
      workArea.value = { ...EMPTY_WORK_AREA }
      return
    }
    workArea.value = measureElement(el)
  }

  function disconnectObserver() {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  function observeStage(el: HTMLElement) {
    disconnectObserver()
    refreshWorkArea()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    resizeObserver = new ResizeObserver(() => refreshWorkArea())
    resizeObserver.observe(el)
  }

  watch(
    shellStageRef,
    (el) => {
      disconnectObserver()
      if (el instanceof HTMLElement) {
        observeStage(el)
      } else {
        workArea.value = { ...EMPTY_WORK_AREA }
      }
    },
    { immediate: true },
  )

  watch(
    () => desktopWorkspaceStore.overview,
    (open) => {
      if (!open) {
        refreshWorkArea()
      }
    },
  )

  if (typeof globalThis !== 'undefined') {
    globalThis.addEventListener('resize', refreshWorkArea)
    onScopeDispose(() => {
      globalThis.removeEventListener('resize', refreshWorkArea)
      disconnectObserver()
    })
  } else {
    onScopeDispose(disconnectObserver)
  }

  return {
    workArea: readonly(workArea),
    refreshWorkArea,
  }
}
