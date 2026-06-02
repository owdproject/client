import { computed } from 'vue'
import { useAppConfig } from 'nuxt/app'
import { defu } from 'defu'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopDefaultAppsStore } from '../stores/storeDesktopDefaultApps'

/**
 * Desktop Manager composable (singleton pattern via Pinia + app config).
 * Agnostic of any theme: merges runtime shell config and exposes default-app routing.
 */
export function useDesktopManager() {
  const appConfig = useAppConfig()
  const desktopStore = useDesktopStore()
  const defaultAppsStore = useDesktopDefaultAppsStore()

  /**
   * Merges and sets the desktop config at runtime (shell geometry, feature flags, etc.).
   */
  function setConfig(newConfig: DesktopConfig) {
    if (!appConfig) return

    appConfig.desktop = defu(
      newConfig,
      (appConfig.desktop ?? {}) as DesktopConfig,
    ) as DesktopConfig
  }

  /** Map of feature name → default app handler (e.g. terminal, browser). */
  const defaultApps = computed(
    () => desktopStore.state.defaultApps,
  )

  function getDefaultApp(feature: string) {
    return defaultAppsStore.getDefaultApp(feature)
  }

  function setDefaultApp(
    feature: string,
    application: IApplicationController,
    entry: string,
  ) {
    defaultAppsStore.setDefaultApp(feature, application, entry)
  }

  return {
    setConfig,
    defaultApps,
    getDefaultApp,
    setDefaultApp,
  }
}
