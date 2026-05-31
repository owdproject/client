import { getActivePinia } from 'pinia'
import { useApplicationManager } from '../composables/useApplicationManager'

const pendingDesktopApps: ApplicationConfig[] = []

/**
 * Register a desktop app. Queues until Pinia is active when theme/app plugins
 * run before @pinia/nuxt (e.g. published apps using `app:created`).
 */
export async function defineDesktopApp(config: ApplicationConfig) {
  if (import.meta.server) return undefined

  if (getActivePinia()) {
    const applicationManager = useApplicationManager()
    return applicationManager.defineApp(config.id, config)
  }

  pendingDesktopApps.push(config)
  return undefined
}

export async function flushPendingDesktopApps() {
  if (pendingDesktopApps.length === 0 || !getActivePinia()) return

  const queue = pendingDesktopApps.splice(0, pendingDesktopApps.length)
  const applicationManager = useApplicationManager()

  for (const config of queue) {
    await applicationManager.defineApp(config.id, config)
  }
}

export function defineDesktopConfig(config: DesktopConfig) {
  return config
}
