import type { Nuxt } from '@nuxt/schema'
import { defu } from 'defu'

/**
 * Merges theme or module defaults into an extension namespace on `public.desktop`.
 * User values from desktop.config win over `partial` (defu: partial fills undefined only).
 */
export function mergeDesktopExtensionConfig(
  nuxt: Nuxt,
  configKey: string,
  partial: Record<string, unknown>,
): void {
  const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
    desktop?: Record<string, unknown>
  }
  const desktop = (pub.desktop ??= {})
  const existing = desktop[configKey]
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}
  desktop[configKey] = defu(partial, base)
}
