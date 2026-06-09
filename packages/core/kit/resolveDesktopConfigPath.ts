import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
