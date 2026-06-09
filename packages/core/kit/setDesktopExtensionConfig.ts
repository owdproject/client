import type { Nuxt } from '@nuxt/schema'

/**
 * Writes a resolved extension namespace to `runtimeConfig.public.desktop[configKey]`.
 * Used by {@link defineDesktopModule} after Nuxt merges inline options with module defaults.
 */
export function setDesktopExtensionConfig(
  nuxt: Nuxt,
  configKey: string,
  resolved: Record<string, unknown>,
): void {
  const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
    desktop?: Record<string, unknown>
  }
  const desktop = (pub.desktop ??= {})
  desktop[configKey] = resolved
}
