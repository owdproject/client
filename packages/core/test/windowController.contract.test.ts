import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed } from 'vue'
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

  it('setLayout saves bounds and clearLayout restores geometry', () => {
    const app = createMockApplication()
    const stored = createWindowStoredState('win-layout')
    stored.state.position = { x: 80, y: 120, z: 1 }
    stored.state.size = { width: 320, height: 240 }

    const window = new WindowController(
      app,
      'main',
      { title: 'A', maximizable: true },
      stored,
    )

    window.actions.setPosition({ x: 200, y: 300 })
    window.actions.setSize({ width: 640, height: 480 })
    window.actions.setLayout('left-half')

    expect(window.state.layout).toBe('left-half')
    expect(window.state.boundsBeforeLayout).toEqual({
      x: 200,
      y: 300,
      width: 640,
      height: 480,
    })

    window.actions.clearLayout()

    expect(window.state.layout).toBe('normal')
    expect(window.state.maximized).toBe(false)
    expect(window.position?.x).toBe(200)
    expect(window.position?.y).toBe(300)
    expect(window.size.width).toBe(640)
    expect(window.size.height).toBe(480)
    expect(window.state.boundsBeforeLayout).toBeUndefined()
  })

  it('toggleMaximize uses layout maximize state', () => {
    const app = createMockApplication()
    const window = new WindowController(
      app,
      'main',
      { title: 'A', maximizable: true },
      createWindowStoredState('win-max'),
    )

    expect(window.actions.toggleMaximize()).toBe(true)
    expect(window.state.layout).toBe('maximize')
    expect(window.isMaximized).toBe(true)

    expect(window.actions.toggleMaximize()).toBe(true)
    expect(window.state.layout).toBe('normal')
    expect(window.isMaximized).toBe(false)
  })

  it('title override is reactive', () => {
    const app = createMockApplication()
    const window = new WindowController(
      app,
      'main',
      { title: 'Original Title' },
      createWindowStoredState('win-override-reactivity'),
    )

    const computedTitle = computed(() => window.title)
    expect(computedTitle.value).toBe('Original Title')

    window.actions.setTitleOverride('New Title')
    expect(computedTitle.value).toBe('New Title')

    window.actions.resetTitleOverride()
    expect(computedTitle.value).toBe('Original Title')
  })
})
