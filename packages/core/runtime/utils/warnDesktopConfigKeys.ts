/** Nuxt top-level option names — warn if present in desktop.config (likely misconfiguration). */
const NUXT_OPTION_KEYS = new Set([
  'ssr',
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

/**
 * Warn when desktop.config.ts contains keys that look like Nuxt options.
 * Extension keys (fs, terminal, custom app namespaces) are intentionally not validated here.
 */
export function warnDesktopConfigKeys(
  config: Record<string, unknown>,
  configFile = 'desktop.config.ts',
): void {
  for (const key of Object.keys(config)) {
    if (NUXT_OPTION_KEYS.has(key)) {
      console.warn(
        `[@owdproject/core] ${configFile}: key "${key}" looks like a Nuxt option and is ignored for _nuxt.options. Move it to nuxt.config.ts; shell values belong under defineDesktopConfig({ systemBar, workspaces, ... }).`,
      )
    }
  }
}
