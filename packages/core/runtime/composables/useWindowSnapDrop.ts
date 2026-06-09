import type { DesktopWorkAreaRect, IWindowController } from '@owdproject/core'
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import {
  detectSnapZone,
  type SnapZoneHint,
} from '../utils/utilDetectSnapZone'
import { applySnapToWindow, computeSnapRect } from '../utils/utilWindowLayout'
import { useWorkspaceEdgeDrop } from './useWorkspaceEdgeDrop'

const snapHint = ref<SnapZoneHint | null>(null)
const isSnapDragActive = ref(false)
let snapDraggingWindowId: string | null = null
let activeWorkArea: DesktopWorkAreaRect = { x: 0, y: 0, width: 0, height: 0 }

function onDocumentPointerMove(e: PointerEvent) {
  updateSnapHintFromPointer(e.clientX, e.clientY)
}

function onDocumentMouseMove(e: MouseEvent) {
  updateSnapHintFromPointer(e.clientX, e.clientY)
}

function stopSnapPointerTracking() {
  document.removeEventListener('pointermove', onDocumentPointerMove)
  document.removeEventListener('mousemove', onDocumentMouseMove)
}

function updateSnapHintFromPointer(clientX: number, clientY: number) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  if (!isSnapDragActive.value || desktopWorkspaceStore.overview) {
    snapHint.value = null
    return
  }

  const deferSide =
    desktopWorkspaceStore.list.length > 1 &&
    !desktopWorkspaceStore.overview

  snapHint.value = detectSnapZone(clientX, clientY, activeWorkArea, {
    deferSideSnapForWorkspaceEdge: deferSide,
  })
}

/**
 * While dragging a maximizable window, highlight snap zones in the shell work area.
 */
export function useWindowSnapDrop() {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  function beginWindowSnapDrag(
    windowId: string,
    workArea: DesktopWorkAreaRect,
    maximizable: boolean,
  ) {
    if (desktopWorkspaceStore.overview) return
    if (!maximizable) return
    if (workArea.width <= 0 || workArea.height <= 0) return

    snapDraggingWindowId = windowId
    isSnapDragActive.value = true
    activeWorkArea = { ...workArea }
    snapHint.value = null

    document.addEventListener('pointermove', onDocumentPointerMove, {
      passive: true,
    })
    document.addEventListener('mousemove', onDocumentMouseMove, {
      passive: true,
    })
  }

  function commitSnapDrop(win: IWindowController): boolean {
    const zone = snapHint.value
    if (!zone || !snapDraggingWindowId) return false

    return applySnapToWindow(win, zone, activeWorkArea)
  }

  function endWindowSnapDrag(win?: IWindowController): boolean {
    stopSnapPointerTracking()

    let snapped = false
    if (win && snapHint.value) {
      snapped = commitSnapDrop(win)
    }

    isSnapDragActive.value = false
    snapDraggingWindowId = null
    snapHint.value = null

    return snapped
  }

  const snapHintRect = computed(() => {
    const zone = snapHint.value
    if (!zone || activeWorkArea.width <= 0) return null

    return computeSnapRect(zone, activeWorkArea)
  })

  return {
    snapHint,
    snapHintRect,
    isSnapDragActive,
    beginWindowSnapDrag,
    endWindowSnapDrag,
    activeWorkArea: () => activeWorkArea,
  }
}
