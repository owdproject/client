import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const DESKTOP_CONFIG_FILENAME = 'desktop.config.ts'
export const LEGACY_DESKTOP_CONFIG_FILENAME = 'owd.config.ts'

export const LEGACY_CONFIG_DEPRECATION =
  '[@owdproject/core] owd.config.ts is deprecated and kept only for backward compatibility; rename to desktop.config.ts (required from @owdproject/core 3.2).'

/**
 * Resolve the desktop config file under a Nuxt project root (or desktop/ folder).
 *
 * @param {string} rootDir
 * @returns {{ path: string, file: string, legacy: boolean } | null}
 */
export function resolveDesktopConfigPath(rootDir) {
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
    return { path: legacyPath, file: LEGACY_DESKTOP_CONFIG_FILENAME, legacy: true }
  }

  return null
}

/**
 * @param {{ legacy?: boolean, file?: string } | null | undefined} resolved
 */
export function warnLegacyDesktopConfig(resolved) {
  if (resolved?.legacy) {
    console.warn(LEGACY_CONFIG_DEPRECATION)
  }
}

/**
 * Path used when creating or updating config from the CLI (always the new filename).
 *
 * @param {string} desktopDir
 */
export function desktopConfigWritePath(desktopDir) {
  return join(desktopDir, DESKTOP_CONFIG_FILENAME)
}
