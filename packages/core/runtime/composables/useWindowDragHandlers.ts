import type { IWindowController } from '@owdproject/core'
import { useDesktopWindowStore } from '@owdproject/core/runtime/stores/storeDesktopWindow'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useWorkspaceEdgeDrop } from './useWorkspaceEdgeDrop'
import { useWindowSnapDrop } from './useWindowSnapDrop'

/**
 * Wire workspace edge drop and window snap to theme `Window.vue` drag events.
 */
export function useWindowDragHandlers(
  getWindow: () => IWindowController | undefined,
) {
  const desktopWindowStore = useDesktopWindowStore()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const { beginWindowDrag, endWindowDrag } = useWorkspaceEdgeDrop()
  const { beginWindowSnapDrag, endWindowSnapDrag } = useWindowSnapDrop()

  function onDragStart() {
    const win = getWindow()
    if (!win?.state?.id || desktopWorkspaceStore.overview) return

    beginWindowDrag(win.state.id)
    beginWindowSnapDrag(
      win.state.id,
      desktopWindowStore.workArea,
      win.isMaximizable,
    )
  }

  function onDragEnd(data: { left: number; top: number }) {
    const win = getWindow()
    if (!win || desktopWorkspaceStore.overview) return

    const snapped = endWindowSnapDrag(win)
    if (snapped) return

    const moved = endWindowDrag(win)
    if (!moved) {
      win.actions.setPosition({ x: data.left, y: data.top })
      if (win.state.layout && win.state.layout !== 'normal') {
        win.actions.clearLayout()
      }
    }
  }

  return { onDragStart, onDragEnd }
}
