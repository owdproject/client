import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkspaceManager } from '../runtime/composables/useWorkspaceManager'
import { useDesktopWorkspaceStore } from '../runtime/stores/storeDesktopWorkspace'
import { useDesktopStore } from '../runtime/stores/storeDesktop'

const getWindowOpenedId = vi.fn()
const mockApps = new Map<string, IApplicationController>()

vi.mock('../runtime/composables/useApplicationManager', () => ({
  useApplicationManager: () => ({
    getWindowOpenedId,
    apps: mockApps,
  }),
}))

function seedWorkspaces(ids: string[], active: string) {
  const desktopStore = useDesktopStore()
  desktopStore.state.workspace.list = [...ids]
  desktopStore.state.workspace.active = active
}

function mockAppWithWindows(
  windows: Array<{ id: string; workspace?: string }>,
): IApplicationController {
  const map = new Map<string, IWindowController>()
  for (const spec of windows) {
    const setWorkspace = vi.fn()
    map.set(spec.id, {
      state: { workspace: spec.workspace ?? '' },
      actions: { setWorkspace },
    } as unknown as IWindowController)
  }
  return { windows: map } as unknown as IApplicationController
}

describe('useWorkspaceManager contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getWindowOpenedId.mockReset()
    mockApps.clear()
  })

  it('onWorkspaceDrop moves window to target workspace when overview is active', () => {
    const desktopWorkspaceStore = useDesktopWorkspaceStore()
    desktopWorkspaceStore.setOverview(true)

    const setWorkspace = vi.fn()
    getWindowOpenedId.mockReturnValue({
      actions: { setWorkspace },
    })

    const { onWorkspaceDrop } = useWorkspaceManager()
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: (type: string) =>
          type === 'text/plain' ? 'window-id-1' : '',
      },
    } as unknown as DragEvent

    onWorkspaceDrop(event, 'ws-b')

    expect(event.preventDefault).toHaveBeenCalled()
    expect(getWindowOpenedId).toHaveBeenCalledWith('window-id-1')
    expect(setWorkspace).toHaveBeenCalledWith('ws-b')
  })

  it('onWorkspaceDrop is no-op when overview is inactive', () => {
    const { onWorkspaceDrop } = useWorkspaceManager()
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { getData: () => 'window-id-1' },
    } as unknown as DragEvent

    onWorkspaceDrop(event, 'ws-b')

    expect(getWindowOpenedId).not.toHaveBeenCalled()
  })

  it('removeWorkspace migrates windows to last remaining workspace', () => {
    seedWorkspaces(['ws-a', 'ws-b', 'ws-c'], 'ws-b')
    const app = mockAppWithWindows([
      { id: 'w1', workspace: 'ws-b' },
      { id: 'w2', workspace: 'ws-c' },
    ])
    mockApps.set('app-1', app)

    const { removeWorkspace } = useWorkspaceManager()
    const ok = removeWorkspace('ws-b')

    expect(ok).toBe(true)
    const desktopWorkspaceStore = useDesktopWorkspaceStore()
    expect(desktopWorkspaceStore.list).toEqual(['ws-a', 'ws-c'])
    expect(desktopWorkspaceStore.active).toBe('ws-c')

    const w1 = app.windows.get('w1')!
    expect(w1.actions.setWorkspace).toHaveBeenCalledWith('ws-c')
    const w2 = app.windows.get('w2')!
    expect(w2.actions.setWorkspace).not.toHaveBeenCalled()
  })

  it('removeWorkspace is no-op when only two workspaces remain', () => {
    seedWorkspaces(['ws-a', 'ws-b'], 'ws-a')
    mockApps.set('app-1', mockAppWithWindows([{ id: 'w1', workspace: 'ws-b' }]))

    const { removeWorkspace } = useWorkspaceManager()
    const ok = removeWorkspace('ws-b')

    expect(ok).toBe(false)
    const desktopWorkspaceStore = useDesktopWorkspaceStore()
    expect(desktopWorkspaceStore.list).toEqual(['ws-a', 'ws-b'])
  })

  it('removeWorkspace migrates implicit active windows when removing active desktop', () => {
    seedWorkspaces(['ws-a', 'ws-b', 'ws-c'], 'ws-b')
    const app = mockAppWithWindows([{ id: 'w1' }])
    mockApps.set('app-1', app)

    const { removeWorkspace } = useWorkspaceManager()
    removeWorkspace('ws-b')

    const w1 = app.windows.get('w1')!
    expect(w1.actions.setWorkspace).toHaveBeenCalledWith('ws-c')
    expect(useDesktopWorkspaceStore().active).toBe('ws-c')
  })
})
