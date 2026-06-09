import type { Ref } from 'vue'
import { onScopeDispose, watch } from 'vue'
import {
  EMPTY_DESKTOP_WORK_AREA,
  useDesktopWindowStore,
} from '@owdproject/core/runtime/stores/storeDesktopWindow'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

function measureElement(el: HTMLElement) {
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
 * Writes measured bounds to {@link useDesktopWindowStore.workArea}.
 * Pass the same ref themes use for workspace overview live scale.
 */
export function useDesktopWorkArea(
  shellStageRef: Ref<HTMLElement | null | undefined>,
) {
  const desktopWindowStore = useDesktopWindowStore()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  let resizeObserver: ResizeObserver | null = null

  function refreshWorkArea() {
    const el = shellStageRef.value
    if (!el) {
      desktopWindowStore.setWorkArea({ ...EMPTY_DESKTOP_WORK_AREA })
      return
    }
    desktopWindowStore.setWorkArea(measureElement(el))
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
        desktopWindowStore.setWorkArea({ ...EMPTY_DESKTOP_WORK_AREA })
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
    refreshWorkArea,
  }
}
