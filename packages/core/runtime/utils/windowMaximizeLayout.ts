function computeMaximizeRect(workArea: DesktopWorkAreaRect): WindowBounds {
  const { x, y, width, height } = workArea
  return { x, y, width, height }
}

function applyWindowBounds(
  win: IWindowController,
  bounds: WindowBounds,
): void {
  win.actions.setPosition({ x: bounds.x, y: bounds.y })
  win.actions.setSize({ width: bounds.width, height: bounds.height })
}

function applyMaximizeToWindow(
  win: IWindowController,
  workArea: DesktopWorkAreaRect,
): boolean {
  if (!win.isMaximizable) {
    return false
  }

  win.actions.setLayout('maximize')
  applyWindowBounds(win, computeMaximizeRect(workArea))
  return true
}

export function toggleWindowMaximizeLayout(
  win: IWindowController,
  workArea: DesktopWorkAreaRect,
): boolean {
  if (!win.isMaximizable) {
    return false
  }

  if (win.isMaximized || (win.state.layout && win.state.layout !== 'normal')) {
    return win.actions.clearLayout()
  }

  if (workArea.width <= 0 || workArea.height <= 0) {
    return win.actions.setLayout('maximize')
  }

  return applyMaximizeToWindow(win, workArea)
}
