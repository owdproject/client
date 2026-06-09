import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  defineDesktopApp,
  flushPendingDesktopApps,
  registerDesktopPluginPinia,
} from '../kit/defineDesktopApp'

const minimalAppConfig = {
  id: 'org.owdproject.test',
  name: 'Test',
  icon: 'mdi:test',
  windows: [],
} as ApplicationConfig

describe('defineDesktopApp', () => {
  beforeEach(() => {
    registerDesktopPluginPinia(undefined)
    vi.stubGlobal('import', { meta: { server: false } })
  })

  it('queues apps until Pinia is registered, then flushes', async () => {
    await defineDesktopApp(minimalAppConfig)

    const pinia = createPinia()
    registerDesktopPluginPinia(pinia)
    setActivePinia(pinia)

    await flushPendingDesktopApps()

    const { useApplicationManager } = await import(
      '../runtime/composables/useApplicationManager'
    )
    const manager = useApplicationManager()
    expect(manager.isAppDefined('org.owdproject.test')).toBeTruthy()
  })
})
