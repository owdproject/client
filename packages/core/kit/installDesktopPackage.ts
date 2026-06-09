import { installModule } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

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
