import { createResolver, defineNuxtModule, type NuxtModule } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { defu } from 'defu'
import { registerTailwindPath } from './registerTailwindPath'

type DesktopThemeDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
>

export type DefineDesktopThemeOptions = {
  moduleUrl: string
  tailwind?: boolean | string | string[]
}

const DEFAULT_THEME_TAILWIND_GLOB = './runtime/components/**/*.{vue,mjs,ts}'

function resolveThemeOptions(
  themeOptions?: string | DefineDesktopThemeOptions,
): { moduleUrl?: string; tailwind: boolean | string | string[] } {
  if (!themeOptions) {
    return { moduleUrl: undefined, tailwind: false }
  }
  if (typeof themeOptions === 'string') {
    return { moduleUrl: themeOptions, tailwind: true }
  }
  return {
    moduleUrl: themeOptions.moduleUrl,
    tailwind: themeOptions.tailwind ?? true,
  }
}

function registerThemeTailwindPaths(
  nuxt: Nuxt,
  moduleUrl: string,
  tailwind: boolean | string | string[],
) {
  if (tailwind === false) return

  const { resolve } = createResolver(moduleUrl)
  const globs =
    tailwind === true
      ? [DEFAULT_THEME_TAILWIND_GLOB]
      : Array.isArray(tailwind)
        ? tailwind
        : [tailwind]

  for (const glob of globs) {
    registerTailwindPath(nuxt, resolve(glob))
  }
}

/**
 * Nuxt module wrapper for desktop themes.
 * Merges theme shell defaults into `runtimeConfig.public.desktop` (user desktop.config wins).
 *
 * Pass `import.meta.url` (or `{ moduleUrl, tailwind? }`) as the second argument to register
 * Tailwind content for theme components automatically.
 */
export function defineDesktopTheme(
  definition: DesktopThemeDefinition,
  themeOptions?: string | DefineDesktopThemeOptions,
): ReturnType<typeof defineNuxtModule> {
  const { moduleUrl, tailwind } = resolveThemeOptions(themeOptions)
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

      if (moduleUrl) {
        registerThemeTailwindPaths(nuxt, moduleUrl, tailwind)
      }

      if (typeof userSetup === 'function') {
        return userSetup(options, nuxt)
      }
    },
  } as NuxtModule)
}
