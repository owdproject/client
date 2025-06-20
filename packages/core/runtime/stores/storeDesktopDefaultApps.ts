import { defineStore } from 'pinia'
import { useAppConfig } from 'nuxt/app'
import { useDesktopStore } from './storeDesktop'

export const useDesktopDefaultAppsStore = defineStore(
  'owd/desktop/defaultApps',
  () => {
    const desktopStore = useDesktopStore()

    /**
     * Sets a default app for a given feature
     */
    function setDefaultApp(
      feature: string,
      application: IApplicationController,
      command: string,
    ) {
      if (desktopStore.state.hasOwnProperty('defaultApps')) {
        desktopStore.state.defaultApps = {}
      }

      desktopStore.state.defaultApps[feature] = {
        application,
        command,
      }
    }

    /**
     * Gets the default app config for a given feature
     */
    function getDefaultApp(feature: string): DefaultAppConfig {
      if (desktopStore.state.hasOwnProperty('defaultApps')) {
        desktopStore.state.defaultApps = {}
      }

      return desktopStore.state.defaultApps[feature] as DefaultAppConfig
    }

    /**
     * Loads default apps from current config
     */
    function loadDefaultAppsFromConfig() {
      const appConfig = useAppConfig()

      if (appConfig.desktop.defaultApps) {
        desktopStore.state.defaultApps = appConfig.desktop.defaultApps
      }
    }

    return {
      setDefaultApp,
      getDefaultApp,
      loadDefaultAppsFromConfig,
    }
  },
)
