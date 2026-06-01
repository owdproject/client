import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useWorkspaceOverviewCapture } from '../src/runtime/composables/useWorkspaceOverviewCapture'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useDesktopStore } from '@owdproject/core/runtime/stores/storeDesktop'

const captureElementToCanvas = vi.fn()

vi.mock('../src/runtime/utils/captureElementToCanvas', () => ({
  captureElementToCanvas: (...args: unknown[]) => captureElementToCanvas(...args),
}))

describe('useWorkspaceOverviewCapture', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    captureElementToCanvas.mockReset()
    captureElementToCanvas.mockImplementation(async (el: HTMLElement | null) => {
      if (!el) return null
      return {
        toDataURL: () => `data:image/jpeg;base64,${el.dataset.workspaceId ?? 'x'}`,
      } as HTMLCanvasElement
    })
  })

  it('captures all workspaces when overview opens', async () => {
    const desktopStore = useDesktopStore()
    desktopStore.state.workspace.list = ['ws-a', 'ws-b']
    desktopStore.state.workspace.active = 'ws-a'

    const roots: Record<string, HTMLElement> = {
      'ws-a': document.createElement('div'),
      'ws-b': document.createElement('div'),
    }
    roots['ws-a'].dataset.workspaceId = 'ws-a'
    roots['ws-b'].dataset.workspaceId = 'ws-b'

    const { thumbnails, thumbnailFor } = useWorkspaceOverviewCapture(
      (id) => roots[id] ?? null,
      { debounceMs: 0 },
    )

    const desktopWorkspaceStore = useDesktopWorkspaceStore()
    desktopWorkspaceStore.setOverview(true)

    await vi.waitFor(() => {
      expect(thumbnails.value.size).toBe(2)
    })

    expect(captureElementToCanvas).toHaveBeenCalledTimes(2)
    expect(thumbnailFor('ws-a')).toBe('data:image/jpeg;base64,ws-a')
    expect(thumbnailFor('ws-b')).toBe('data:image/jpeg;base64,ws-b')
  })

  it('clears thumbnails when overview closes', async () => {
    const desktopStore = useDesktopStore()
    desktopStore.state.workspace.list = ['ws-a']
    desktopStore.state.workspace.active = 'ws-a'

    const root = document.createElement('div')
    root.dataset.workspaceId = 'ws-a'

    const { thumbnails } = useWorkspaceOverviewCapture(() => root, {
      debounceMs: 0,
    })

    const desktopWorkspaceStore = useDesktopWorkspaceStore()
    desktopWorkspaceStore.setOverview(true)

    await vi.waitFor(() => {
      expect(thumbnails.value.size).toBe(1)
    })

    desktopWorkspaceStore.setOverview(false)
    await nextTick()

    expect(thumbnails.value.size).toBe(0)
  })

  it('refreshThumbnails is a no-op when overview is inactive', async () => {
    const root = document.createElement('div')
    const { thumbnails, refreshThumbnails } = useWorkspaceOverviewCapture(
      () => root,
    )

    await refreshThumbnails()
    await nextTick()

    expect(thumbnails.value.size).toBe(0)
    expect(captureElementToCanvas).not.toHaveBeenCalled()
  })
})
