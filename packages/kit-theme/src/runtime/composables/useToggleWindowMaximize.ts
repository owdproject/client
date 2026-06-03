import type { IWindowController } from '@owdproject/core'
import { inject } from 'vue'
import { toggleWindowMaximizeLayout } from '../utils/windowLayout'
import { desktopWorkAreaKey } from './provideDesktopShellStage'

/**
 * Maximize / restore using shell work area geometry (call from theme window nav).
 */
export function useToggleWindowMaximize() {
  const workAreaRef = inject(desktopWorkAreaKey, null)

  return function toggle(win: IWindowController | undefined) {
    if (!win?.instanced) return false
    const workArea = workAreaRef?.value ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    }
    return toggleWindowMaximizeLayout(win, workArea)
  }
}
