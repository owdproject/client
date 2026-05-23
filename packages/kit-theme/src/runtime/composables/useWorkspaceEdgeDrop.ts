import { computed, ref } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

/** Viewport band (px) where a window drag targets the adjacent workspace. */
export const WORKSPACE_EDGE_DROP_PX = 72

const edgeHint = ref<'left' | 'right' | null>(null)
const isWindowDragActive = ref(false)
let draggingWindowId: string | null = null

function adjacentWorkspaceId(side: 'left' | 'right'): string | null {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  if (desktopWorkspaceStore.overview) return null
  const list = desktopWorkspaceStore.list
  if (list.length < 2) return null

  const index = desktopWorkspaceStore.workspaceActiveIndex
  if (index < 0) return null

  if (side === 'left' && index > 0) {
    return list[index - 1] ?? null
  }
  if (side === 'right' && index < list.length - 1) {
    return list[index + 1] ?? null
  }
  return null
}

function updateEdgeHintFromClientX(clientX: number) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  if (!isWindowDragActive.value || desktopWorkspaceStore.overview) {
    edgeHint.value = null
    return
  }

  const viewportWidth =
    typeof globalThis !== 'undefined' ? globalThis.innerWidth : 0

  if (clientX <= WORKSPACE_EDGE_DROP_PX && adjacentWorkspaceId('left')) {
    edgeHint.value = 'left'
    return
  }

  if (
    clientX >= viewportWidth - WORKSPACE_EDGE_DROP_PX &&
    adjacentWorkspaceId('right')
  ) {
    edgeHint.value = 'right'
    return
  }

  edgeHint.value = null
}

function onDocumentPointerMove(e: PointerEvent) {
  updateEdgeHintFromClientX(e.clientX)
}

function stopPointerTracking() {
  document.removeEventListener('pointermove', onDocumentPointerMove)
}

/**
 * While dragging a window (normal desktop, not overview), highlight left/right
 * screen edges when an adjacent workspace exists so the user can drop there.
 */
export function useWorkspaceEdgeDrop() {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()

  function beginWindowDrag(windowId: string) {
    if (desktopWorkspaceStore.overview) return
    if (desktopWorkspaceStore.list.length < 2) return

    draggingWindowId = windowId
    isWindowDragActive.value = true
    edgeHint.value = null

    document.addEventListener('pointermove', onDocumentPointerMove, {
      passive: true,
    })
  }

  function commitEdgeDrop(win: IWindowController) {
    const side = edgeHint.value
    if (!side || !draggingWindowId) return false

    const targetWorkspaceId = adjacentWorkspaceId(side)
    if (!targetWorkspaceId) return false

    win.actions.setWorkspace(targetWorkspaceId)
    desktopWorkspaceStore.setWorkspace(targetWorkspaceId)

    const inset = WORKSPACE_EDGE_DROP_PX + 24
    const pos = win.position
    if (pos) {
      const viewportWidth =
        typeof globalThis !== 'undefined' ? globalThis.innerWidth : 1920
      const x =
        side === 'left'
          ? inset
          : Math.max(
              inset,
              viewportWidth - (win.size?.width ?? 400) - inset,
            )
      win.actions.setPosition({ x, y: pos.y })
    }

    return true
  }

  function endWindowDrag(win?: IWindowController): boolean {
    stopPointerTracking()

    let moved = false
    if (win && edgeHint.value) {
      moved = commitEdgeDrop(win)
    }

    isWindowDragActive.value = false
    draggingWindowId = null
    edgeHint.value = null

    return moved
  }

  const edgeTargetDesktopIndex = computed(() => {
    const side = edgeHint.value
    if (!side) return null

    const targetId = adjacentWorkspaceId(side)
    if (!targetId) return null

    const index = desktopWorkspaceStore.list.indexOf(targetId)
    return index >= 0 ? index + 1 : null
  })

  return {
    edgeHint,
    edgeTargetDesktopIndex,
    isWindowDragActive,
    beginWindowDrag,
    endWindowDrag,
    adjacentWorkspaceId,
  }
}

/**
 * Wire {@link useWorkspaceEdgeDrop} to CoreWindow drag events (theme Window wrapper).
 */
export function useWorkspaceEdgeDropWindowHandlers(
  getWindow: () => IWindowController | undefined,
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const { beginWindowDrag, endWindowDrag } = useWorkspaceEdgeDrop()

  function onDragStart() {
    const win = getWindow()
    if (!win?.state?.id || desktopWorkspaceStore.overview) return
    beginWindowDrag(win.state.id)
  }

  function onDragEnd(data: { left: number; top: number }) {
    const win = getWindow()
    const moved =
      Boolean(win) &&
      !desktopWorkspaceStore.overview &&
      endWindowDrag(win)

    if (!moved && win) {
      win.actions.setPosition({ x: data.left, y: data.top })
    }
  }

  return { onDragStart, onDragEnd }
}
