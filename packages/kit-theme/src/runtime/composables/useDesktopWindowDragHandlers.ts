import type { DesktopWorkAreaRect, IWindowController } from '@owdproject/core'
import { inject } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { desktopWorkAreaKey } from './provideDesktopShellStage'
import { useWorkspaceEdgeDrop } from './useWorkspaceEdgeDrop'
import { useWindowSnapDrop } from './useWindowSnapDrop'

const EMPTY_WORK_AREA: DesktopWorkAreaRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

/**
 * Wire workspace edge drop and window snap to theme `Window.vue` drag events.
 */
export function useDesktopWindowDragHandlers(
  getWindow: () => IWindowController | undefined,
  getWorkArea: () => DesktopWorkAreaRect,
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const { beginWindowDrag, endWindowDrag } = useWorkspaceEdgeDrop()
  const { beginWindowSnapDrag, endWindowSnapDrag } = useWindowSnapDrop()

  function onDragStart() {
    const win = getWindow()
    if (!win?.state?.id || desktopWorkspaceStore.overview) return

    beginWindowDrag(win.state.id)
    beginWindowSnapDrag(
      win.state.id,
      getWorkArea(),
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

/**
 * Wire drag handlers using work area provided by the theme desktop root.
 */
export function useDesktopWindowDragHandlersInjected(
  getWindow: () => IWindowController | undefined,
) {
  const workAreaRef = inject(desktopWorkAreaKey, null)

  return useDesktopWindowDragHandlers(
    getWindow,
    () => workAreaRef?.value ?? EMPTY_WORK_AREA,
  )
}
