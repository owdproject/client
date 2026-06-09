/**
 * Collect open windows that belong to a workspace (explicit id or implicit active desktop).
 */
export function collectWindowsOnWorkspace(
  apps: Iterable<IApplicationController>,
  workspaceId: string,
  activeWorkspaceId: string,
): IWindowController[] {
  const result: IWindowController[] = []

  for (const app of apps) {
    for (const win of app.windows.values()) {
      const ws = win.state.workspace
      if (ws === workspaceId) {
        result.push(win)
        continue
      }
      if (!ws && workspaceId === activeWorkspaceId) {
        result.push(win)
      }
    }
  }

  return result
}

export function countWindowsOnWorkspace(
  apps: Iterable<IApplicationController>,
  workspaceId: string,
  activeWorkspaceId: string,
): number {
  return collectWindowsOnWorkspace(apps, workspaceId, activeWorkspaceId).length
}
