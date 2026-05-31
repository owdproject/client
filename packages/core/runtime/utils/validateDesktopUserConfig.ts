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
