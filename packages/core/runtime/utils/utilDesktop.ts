import { getActivePinia, setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { useApplicationManager } from '../composables/useApplicationManager'

const pendingDesktopApps: ApplicationConfig[] = []

let pluginPiniaInstance: Pinia | undefined

/** Set by desktop-shell-init; avoids importing nuxt/app during jiti config load. */
export function registerDesktopPluginPinia(pinia: Pinia | undefined) {
  pluginPiniaInstance = pinia
}

function resolveActivePinia() {
  const active = getActivePinia()
  if (active) return active

  if (pluginPiniaInstance) {
    setActivePinia(pluginPiniaInstance)
    return pluginPiniaInstance
  }

  return undefined
}

/**
 * Register a desktop app. Queues until Pinia is active when theme/app plugins
 * run before shell-init (legacy published apps using synchronous setup).
 */
export async function defineDesktopApp(config: ApplicationConfig) {
  if (import.meta.server) return undefined

  if (resolveActivePinia()) {
    const applicationManager = useApplicationManager()
    return applicationManager.defineApp(config.id, config)
  }

  pendingDesktopApps.push(config)
  return undefined
}

export async function flushPendingDesktopApps() {
  if (pendingDesktopApps.length === 0) return

  if (!resolveActivePinia()) return

  const queue = pendingDesktopApps.splice(0, pendingDesktopApps.length)
  const applicationManager = useApplicationManager()

  for (const config of queue) {
    await applicationManager.defineApp(config.id, config)
  }
}

