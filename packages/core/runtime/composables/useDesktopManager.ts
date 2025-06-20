import { deepMerge } from '../utils/utilCommon'
import { useAppConfig } from 'nuxt/app'

/**
 * Desktop Manager Composable (Singleton)
 */
export function useDesktopManager() {
  /**
   * Merges and sets the desktop config at runtime
   *
   * @param newConfig
   */
  function setConfig(newConfig: DesktopConfig) {
    const appConfig = useAppConfig()

    appConfig.desktop = deepMerge(
      appConfig.desktop,
      newConfig,
    ) as DesktopConfig
  }

  return {
    setConfig,
  }
}
