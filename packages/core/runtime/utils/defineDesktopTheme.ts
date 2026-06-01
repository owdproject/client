import { defineNuxtModule, type NuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

type DesktopThemeDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
>

/**
 * Nuxt module wrapper for desktop themes.
 * Merges theme shell defaults into `runtimeConfig.public.desktop` (user desktop.config wins).
 */
export function defineDesktopTheme(
  definition: DesktopThemeDefinition,
): ReturnType<typeof defineNuxtModule> {
  const userSetup = definition.setup

  return defineNuxtModule({
    ...definition,
    meta: {
      ...definition.meta,
      configKey: 'desktop',
    },
    async setup(options, nuxt) {
      const pub = (nuxt.options.runtimeConfig.public ??= {}) as {
        desktop?: Record<string, unknown>
      }
      pub.desktop = defu(
        (pub.desktop ?? {}) as Record<string, unknown>,
        options as Record<string, unknown>,
      )

      if (typeof userSetup === 'function') {
        return userSetup(options, nuxt)
      }
    },
  } as NuxtModule)
}
