/**
 * Runtime validation for the object exported from `owd.config.ts`.
 * Fails fast with clear messages when `theme`, `apps`, or `modules` have the wrong shape.
 */
export function assertValidOwdUserConfig(config: unknown): void {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      '[@owdproject/core] owd.config.ts must default-export a non-array object from defineDesktopConfig({ ... }).',
    )
  }

  const c = config as Record<string, unknown>

  if (c.theme != null && typeof c.theme !== 'string') {
    throw new Error(
      '[@owdproject/core] owd.config.ts: `theme` must be a string (npm package name of the theme module).',
    )
  }

  if (c.apps !== undefined) {
    if (
      !Array.isArray(c.apps) ||
      !(c.apps as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        '[@owdproject/core] owd.config.ts: `apps` must be an array of strings (Nuxt module package names).',
      )
    }
  }

  if (c.modules !== undefined) {
    if (
      !Array.isArray(c.modules) ||
      !(c.modules as unknown[]).every((item) => typeof item === 'string')
    ) {
      throw new Error(
        '[@owdproject/core] owd.config.ts: `modules` must be an array of strings (Nuxt module package names).',
      )
    }
  }
}
