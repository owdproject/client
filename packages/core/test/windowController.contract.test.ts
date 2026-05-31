import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WindowController } from '../runtime/internal/controllers/WindowController'
import { useDesktopWindowStore } from '../runtime/stores/storeDesktopWindow'

function createMockApplication(title = 'Test App') {
  return {
    id: 'test-app',
    config: { title, icon: undefined, category: '' },
  } as IApplicationController
}

function createWindowStoredState(id: string): WindowStoredState {
  return {
    model: 'main',
    meta: {},
    state: {
      id,
      createdAt: Date.now(),
      workspace: 'default',
      focused: false,
      active: true,
      position: { x: 0, y: 0, z: 0 },
    },
  }
}

describe('WindowController contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('focus assigns incrementing z-index via desktop window store', () => {
    const app = createMockApplication()
    const stored = createWindowStoredState('win-a')
    const window = new WindowController(
      app,
      'main',
      { title: 'A', minimizable: true },
      stored,
    )

    const desktopWindowStore = useDesktopWindowStore()
    expect(desktopWindowStore.positionZ).toBe(0)

    window.focus()

    expect(window.state.focused).toBe(true)
    expect(window.state.position?.z).toBe(1)
    expect(desktopWindowStore.positionZ).toBe(1)
  })

  it('minimize hides window; unminimize restores active state', () => {
    const app = createMockApplication()
    const window = new WindowController(
      app,
      'main',
      { title: 'A', minimizable: true },
      createWindowStoredState('win-b'),
    )

    expect(window.state.active).toBe(true)
    expect(window.minimize()).toBe(true)
    expect(window.state.active).toBe(false)
    expect(window.unminimize()).toBe(true)
    expect(window.state.active).toBe(true)
  })

  it('setWorkspace updates window workspace id', () => {
    const app = createMockApplication()
    const window = new WindowController(
      app,
      'main',
      { title: 'A' },
      createWindowStoredState('win-c'),
    )

    window.setWorkspace('workspace-2')
    expect(window.state.workspace).toBe('workspace-2')
  })

  it('bringToFront action alias matches focus z-order behavior', () => {
    const app = createMockApplication()
    const window = new WindowController(
      app,
      'main',
      { title: 'A' },
      createWindowStoredState('win-d'),
    )

    window.actions.bringToFront()
    expect(window.state.focused).toBe(true)
    expect(window.state.position?.z).toBeGreaterThan(0)
  })
})
