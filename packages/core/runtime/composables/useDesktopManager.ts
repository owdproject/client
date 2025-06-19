import { useRuntimeConfig } from 'nuxt/app'
import { deepMerge } from '../utils/utilCommon'

const defaultApps: DefaultAppsConfig = {}

/**
 * Desktop Manager Composable (Singleton)
 */
export function useDesktopManager() {
  const runtimeConfig = useRuntimeConfig()

  /**
   * Returns the current desktop config from runtime
   */
  function getConfig(): DesktopConfig {
    return runtimeConfig.public.desktop
  }

  /**
   * Checks if a feature is enabled in desktop config
   *
   * @param featureName
   */
  function hasFeature(featureName: string): boolean {
    return getConfig().features?.includes(featureName) ?? false
  }

  /**
   * Merges and sets the desktop config at runtime
   *
   * @param newConfig
   */
  function setConfig(newConfig: DesktopConfig) {
    runtimeConfig.public.desktop = deepMerge(
      runtimeConfig.public.desktop,
      newConfig,
    ) as DesktopConfig

    loadDefaultAppsFromConfig()
  }

  /**
   * Sets a default app for a given feature
   */
  function setDefaultApp(
    feature: string,
    application: IApplicationController,
    command: string,
  ) {
    defaultApps[feature] = {
      application,
      command,
    }
  }

  /**
   * Gets the default app config for a given feature
   */
  function getDefaultApp(feature: string): DefaultAppConfig {
    return defaultApps[feature] as DefaultAppConfig
  }

  /**
   * Loads default apps from current config
   */
  function loadDefaultAppsFromConfig() {
    if (getConfig().defaultApps) {
      Object.assign(defaultApps, getConfig().defaultApps)
    }
  }

  return {
    getConfig,
    hasFeature,
    setConfig,
    setDefaultApp,
    getDefaultApp,
    loadDefaultAppsFromConfig,
  }
}
