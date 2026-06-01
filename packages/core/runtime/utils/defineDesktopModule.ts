import { defineNuxtModule, type NuxtModule } from '@nuxt/kit'
import { setDesktopExtensionConfig } from './setDesktopExtensionConfig'

type DesktopModuleMeta = {
  name: string
  configKey: string
}

type DesktopModuleDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
> & {
  meta: DesktopModuleMeta
}

/**
 * Nuxt module wrapper for desktop apps and extension modules (`configKey` → desktop.config namespace).
 * Publishes merged options to `runtimeConfig.public.desktop[configKey]` after setup runs.
 */
export function defineDesktopModule(
  definition: DesktopModuleDefinition,
): ReturnType<typeof defineNuxtModule> {
  const configKey = definition.meta.configKey
  if (!configKey) {
    throw new Error(
      '[@owdproject/core] defineDesktopModule requires meta.configKey (e.g. "terminal", "fs").',
    )
  }

  const userSetup = definition.setup

  return defineNuxtModule({
    ...definition,
    async setup(options, nuxt) {
      setDesktopExtensionConfig(
        nuxt,
        configKey,
        options as Record<string, unknown>,
      )
      if (typeof userSetup === 'function') {
        return userSetup(options, nuxt)
      }
    },
  } as NuxtModule)
}
