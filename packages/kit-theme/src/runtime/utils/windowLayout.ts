import type {
  DesktopWorkAreaRect,
  IWindowController,
  WindowBounds,
  WindowLayout,
} from '@owdproject/core'

export type { WindowLayout, WindowBounds, DesktopWorkAreaRect }

export function workAreaBottom(workArea: DesktopWorkAreaRect): number {
  return workArea.y + workArea.height
}

export function workAreaRight(workArea: DesktopWorkAreaRect): number {
  return workArea.x + workArea.width
}

/**
 * Viewport rectangle for a snap zone inside the shell work area.
 */
export function computeSnapRect(
  zone: Exclude<WindowLayout, 'normal'>,
  workArea: DesktopWorkAreaRect,
): WindowBounds {
  const { x, y, width, height } = workArea
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)

  switch (zone) {
    case 'maximize':
      return { x, y, width, height }
    case 'left-half':
      return { x, y, width: halfW, height }
    case 'right-half':
      return { x: x + halfW, y, width: width - halfW, height }
    case 'bottom-half':
      return { x, y: y + halfH, width, height: height - halfH }
    case 'top-left':
      return { x, y, width: halfW, height: halfH }
    case 'top-right':
      return { x: x + halfW, y, width: width - halfW, height: halfH }
    case 'bottom-left':
      return { x, y: y + halfH, width: halfW, height: height - halfH }
    case 'bottom-right':
      return {
        x: x + halfW,
        y: y + halfH,
        width: width - halfW,
        height: height - halfH,
      }
    default: {
      const _exhaustive: never = zone
      return _exhaustive
    }
  }
}

export function applyWindowBounds(
  win: IWindowController,
  bounds: WindowBounds,
): void {
  win.actions.setPosition({ x: bounds.x, y: bounds.y })
  win.actions.setSize({ width: bounds.width, height: bounds.height })
}

export function applySnapToWindow(
  win: IWindowController,
  zone: Exclude<WindowLayout, 'normal'>,
  workArea: DesktopWorkAreaRect,
): boolean {
  if (!win.isMaximizable) {
    return false
  }

  win.actions.setLayout(zone)
  applyWindowBounds(win, computeSnapRect(zone, workArea))
  return true
}

export function restoreWindowBounds(win: IWindowController): boolean {
  return win.actions.clearLayout()
}

export function toggleWindowMaximizeLayout(
  win: IWindowController,
  workArea: DesktopWorkAreaRect,
): boolean {
  if (!win.isMaximizable) {
    return false
  }

  if (win.isMaximized || (win.state.layout && win.state.layout !== 'normal')) {
    return restoreWindowBounds(win)
  }

  if (workArea.width <= 0 || workArea.height <= 0) {
    win.actions.setLayout('maximize')
    return true
  }

  return applySnapToWindow(win, 'maximize', workArea)
}
