/**
 * Keys consumed by {@link @owdproject/core} module setup (install order).
 * Must not be spread onto `_nuxt.options`.
 */
export const DESKTOP_MODULE_KEYS = ['theme', 'apps', 'modules'] as const

/**
 * Known desktop shell keys merged into `runtimeConfig.public.desktop` / `appConfig.desktop`.
 * Additional keys are merged with a dev warning (extensions, theme overrides).
 */
export const DESKTOP_RUNTIME_KEYS = new Set([
  ...DESKTOP_MODULE_KEYS,
  'docs',
  'name',
  'defaultApps',
  'features',
  'explorer',
  'systemBar',
  'dockBar',
  'workspaces',
])

/** Nuxt top-level option names — warn if present in desktop.config (likely misconfiguration). */
const NUXT_OPTION_KEYS = new Set([
  'ssr',
  'modules',
  'devtools',
  'vite',
  'nitro',
  'runtimeConfig',
  'app',
  'appConfig',
  'css',
  'plugins',
  'hooks',
  'extends',
  'compatibilityDate',
  'experimental',
  'future',
  'i18n',
  'tailwindcss',
  'primevue',
])

export type SplitDesktopUserConfigResult = {
  theme?: string
  apps?: string[]
  modules?: string[]
  desktopRuntime: Record<string, unknown>
}

export function splitDesktopUserConfig(
  config: Record<string, unknown>,
  configFile = 'desktop.config.ts',
): SplitDesktopUserConfigResult {
  const theme =
    typeof config.theme === 'string' ? config.theme : undefined
  const apps = Array.isArray(config.apps)
    ? (config.apps as string[])
    : undefined
  const modules = Array.isArray(config.modules)
    ? (config.modules as string[])
    : undefined

  const desktopRuntime: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(config)) {
    if (DESKTOP_MODULE_KEYS.includes(key as (typeof DESKTOP_MODULE_KEYS)[number])) {
      continue
    }
    desktopRuntime[key] = value

    if (NUXT_OPTION_KEYS.has(key)) {
      console.warn(
        `[@owdproject/core] ${configFile}: key "${key}" looks like a Nuxt option and is ignored for _nuxt.options. Move it to nuxt.config.ts; shell values belong under defineDesktopConfig({ systemBar, workspaces, ... }).`,
      )
    } else if (!DESKTOP_RUNTIME_KEYS.has(key)) {
      console.warn(
        `[@owdproject/core] ${configFile}: unknown desktop key "${key}" — merged into runtimeConfig.public.desktop only.`,
      )
    }
  }

  return { theme, apps, modules, desktopRuntime }
}
