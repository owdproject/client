import { inject } from 'vue'
import {
  useDesktopWindowStore,
} from '../stores/storeDesktopWindow'
import { toggleWindowMaximizeLayout } from '../utils/utilWindowMaximizeLayout'
import {
  DESKTOP_TOGGLE_WINDOW_MAXIMIZE_KEY,
  type DesktopToggleWindowMaximizeFn,
} from '../constants/desktopShellKeys'

export type { DesktopToggleWindowMaximizeFn }

/**
 * Maximize / restore a window. Themes may override via
 * {@link DESKTOP_TOGGLE_WINDOW_MAXIMIZE_KEY}; otherwise uses
 * {@link useDesktopWindowStore.workArea} (when measured) or
 * {@link IWindowController.actions.toggleMaximize}.
 */
export function useToggleWindowMaximize(): DesktopToggleWindowMaximizeFn {
  const override = inject(DESKTOP_TOGGLE_WINDOW_MAXIMIZE_KEY, null)
  if (override) return override

  const desktopWindowStore = useDesktopWindowStore()

  return function toggle(win: IWindowController | undefined) {
    if (!win?.instanced) return false

    const workArea = desktopWindowStore.workArea
    if (workArea.width > 0 && workArea.height > 0) {
      return toggleWindowMaximizeLayout(win, workArea)
    }

    return win.actions.toggleMaximize()
  }
}
