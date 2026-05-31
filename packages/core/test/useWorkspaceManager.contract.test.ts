import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkspaceManager } from '../runtime/composables/useWorkspaceManager'
import { useDesktopWorkspaceStore } from '../runtime/stores/storeDesktopWorkspace'

const getWindowOpenedId = vi.fn()

vi.mock('../runtime/composables/useApplicationManager', () => ({
  useApplicationManager: () => ({
    getWindowOpenedId,
  }),
}))

describe('useWorkspaceManager contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getWindowOpenedId.mockReset()
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
})
