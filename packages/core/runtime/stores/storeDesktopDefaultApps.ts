import { defineStore } from 'pinia'
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
      entry: string,
    ) {
      if (!desktopStore.state.hasOwnProperty('defaultApps')) {
        desktopStore.state.defaultApps = {}
      }

      desktopStore.state.defaultApps[feature] = {
        application,
        entry,
      }
    }

    /**
     * Gets the default app config for a given feature
     */
    function getDefaultApp(feature: string): DefaultAppConfig {
      if (!desktopStore.state.hasOwnProperty('defaultApps')) {
        desktopStore.state.defaultApps = {}
      }

      return desktopStore.state.defaultApps[feature] as DefaultAppConfig
    }

    /**
     * Loads default apps from current config
     */
    function loadDefaultAppsFromConfig(runtimeConfig) {
      if (runtimeConfig.public.desktop.defaultApps) {
        desktopStore.state.defaultApps = runtimeConfig.public.desktop.defaultApps
      }
    }

    return {
      setDefaultApp,
      getDefaultApp,
      loadDefaultAppsFromConfig,
    }
  },
)
