import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  defineNuxtModule,
  installModule,
  type NuxtModule,
} from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { defu } from 'defu'

/** Root `desktop.config.ts` helper — keep this file free of `import.meta` for jiti. */
export function defineDesktopConfig(config: DesktopConfig) {
  return config
}

/**
 * Runtime validation for the object exported from `desktop.config.ts`
 * (or legacy `owd.config.ts`).
 */
export function assertValidDesktopUserConfig(
  config: unknown,
  configFile = 'desktop.config.ts',
): void {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      `[@owdproject/core] ${configFile} must default-export a non-array object from defineDesktopConfig({ ... }).`,
    )
  }

  const c = config as Record<string, unknown>

  if (c.theme != null && typeof c.theme !== 'string') {
    throw new Error(
      `[@owdproject/core] ${configFile}: \`theme\` must be a string (npm package name of the theme module).`,
    )
  }

  if (c.apps !== undefined) {
    if (
      !Array.isArray(c.apps) ||
      !(c.apps as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        `[@owdproject/core] ${configFile}: \`apps\` must be an array of strings (Nuxt module package names).`,
      )
    }
  }

  if (c.modules !== undefined) {
    if (
      !Array.isArray(c.modules) ||
      !(c.modules as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        `[@owdproject/core] ${configFile}: \`modules\` must be an array of strings (Nuxt module package names).`,
      )
    }
  }
}

export const DESKTOP_CONFIG_FILENAME = 'desktop.config.ts'
export const LEGACY_DESKTOP_CONFIG_FILENAME = 'owd.config.ts'

export const LEGACY_CONFIG_DEPRECATION =
  '[@owdproject/core] owd.config.ts is deprecated and kept only for backward compatibility; rename to desktop.config.ts (required from @owdproject/core 3.2).'

export type ResolvedDesktopConfigPath = {
  path: string
  file: string
  legacy: boolean
}

export function resolveDesktopConfigPath(
  rootDir: string,
): ResolvedDesktopConfigPath | null {
  const desktopPath = join(rootDir, DESKTOP_CONFIG_FILENAME)
  const legacyPath = join(rootDir, LEGACY_DESKTOP_CONFIG_FILENAME)
  const hasDesktop = existsSync(desktopPath)
  const hasLegacy = existsSync(legacyPath)

  if (hasDesktop && hasLegacy) {
    console.warn(
      '[@owdproject/core] Both desktop.config.ts and owd.config.ts exist; using desktop.config.ts. Remove owd.config.ts.',
    )
    return { path: desktopPath, file: DESKTOP_CONFIG_FILENAME, legacy: false }
  }

  if (hasDesktop) {
    return { path: desktopPath, file: DESKTOP_CONFIG_FILENAME, legacy: false }
  }

  if (hasLegacy) {
    return {
      path: legacyPath,
      file: LEGACY_DESKTOP_CONFIG_FILENAME,
      legacy: true,
    }
  }

  return null
}

export function warnLegacyDesktopConfig(
  resolved: ResolvedDesktopConfigPath | null | undefined,
): void {
  if (resolved?.legacy) {
    console.warn(LEGACY_CONFIG_DEPRECATION)
  }
}

/** Path used when creating or updating config from the CLI (always the new filename). */
export function desktopConfigWritePath(desktopDir: string): string {
  return join(desktopDir, DESKTOP_CONFIG_FILENAME)
}

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

type ModuleLike = {
  meta?: { configKey?: string }
  default?: { meta?: { configKey?: string } }
}

function readConfigKey(mod: ModuleLike | undefined): string | undefined {
  const key = mod?.meta?.configKey ?? mod?.default?.meta?.configKey
  return typeof key === 'string' && key.length > 0 ? key : undefined
}

async function loadModuleDescriptor(
  modulePath: string,
): Promise<ModuleLike | undefined> {
  try {
    const imported = await import(modulePath)
    return (imported as { default?: ModuleLike }).default ?? imported
  } catch {
    return undefined
  }
}

/**
 * Installs a desktop theme, module, or app package.
 * When the package exposes `meta.configKey`, passes `desktop[configKey]` to `installModule`
 * so Nuxt merges desktop.config with module defaults.
 */
export async function installDesktopPackage(
  nuxt: Nuxt,
  modulePath: string,
  desktop?: Record<string, unknown>,
): Promise<void> {
  const descriptor = await loadModuleDescriptor(modulePath)
  const configKey = readConfigKey(descriptor)

  if (configKey && desktop) {
    const slice = desktop[configKey]
    const inline =
      slice && typeof slice === 'object' && !Array.isArray(slice)
        ? (slice as Record<string, unknown>)
        : {}
    await installModule(modulePath, inline)
    return
  }

  await installModule(modulePath)
}

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

type DesktopThemeDefinition = NuxtModule<
  Record<string, unknown>,
  Record<string, unknown>,
  false
>

/**
 * Nuxt module wrapper for desktop themes.
 * Merges theme shell defaults into `runtimeConfig.public.desktop` (user desktop.config wins).
 *
 * Tailwind content for theme Vue templates is registered via
 * `@owdproject/kit-primevue/kit/registerTailwindPath` after installing kit-primevue.
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
