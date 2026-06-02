import { setActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { useAppConfig, useRuntimeConfig } from 'nuxt/app'
import { toRaw } from 'vue'
import { useDesktopManager } from '../composables/useDesktopManager'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopDefaultAppsStore } from '../stores/storeDesktopDefaultApps'
import { registerDesktopPluginPinia } from './utilDesktop'

/** Bind Nuxt's Pinia instance for store composables outside component setup timing. */
export function bindDesktopPinia(pinia: Pinia | undefined) {
  if (pinia) {
    setActivePinia(pinia)
    registerDesktopPluginPinia(pinia)
  }
}

/** Sync `appConfig.desktop` from runtime when the composable is not ready yet (early client plugins). */
export function ensureAppConfigDesktop() {
  const runtimeConfig = useRuntimeConfig()
  const publicDesktop = runtimeConfig.public?.desktop
  if (!publicDesktop || typeof publicDesktop !== 'object') return undefined

  let appConfig: ReturnType<typeof useAppConfig> | undefined
  try {
    appConfig = useAppConfig()
  } catch {
    return publicDesktop as DesktopConfig
  }

  if (!appConfig) return publicDesktop as DesktopConfig

  if (!appConfig.desktop) {
    appConfig.desktop = publicDesktop as DesktopConfig
  }

  return appConfig.desktop as DesktopConfig
}

function mergeShellKeysOntoAppConfig() {
  if (import.meta.server) return

  const desktopManager = useDesktopManager()
  const desktop = ensureAppConfigDesktop()
  if (!desktop) return

  desktopManager.setConfig({
    windows: desktop.windows ? toRaw(desktop.windows) : undefined,
    systemBar: desktop.systemBar ? toRaw(desktop.systemBar) : undefined,
    dockBar: desktop.dockBar ? toRaw(desktop.dockBar) : undefined,
    workspaces: desktop.workspaces ? toRaw(desktop.workspaces) : undefined,
  })
}

/** Re-run appConfig shell merge when `useAppConfig()` was not ready during early plugins. */
export function syncDesktopShellAppConfig() {
  mergeShellKeysOntoAppConfig()
}

/** Kernel shell bootstrap: workspaces, default apps, merged shell config on appConfig. */
export function initDesktopShell() {
  if (import.meta.server) return

  const desktopStore = useDesktopStore()
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const runtimeConfig = useRuntimeConfig()
  const desktopDefaultAppsStore = useDesktopDefaultAppsStore()

  if (desktopStore.$persistedState) {
    desktopStore.$persistedState.isReady().then(() => {
      desktopWorkspaceStore.setupWorkspaces()
    })
  } else {
    desktopWorkspaceStore.setupWorkspaces()
  }

  desktopDefaultAppsStore.loadDefaultAppsFromConfig(runtimeConfig)
  mergeShellKeysOntoAppConfig()
}
