import { describe, it, expect } from 'vitest'
import {
  assertValidDesktopUserConfig,
  defineDesktopConfig,
  desktopConfigWritePath,
} from '../kit/authoring'

describe('assertValidDesktopUserConfig', () => {
  it('accepts a minimal valid config', () => {
    expect(() =>
      assertValidDesktopUserConfig(
        defineDesktopConfig({
          theme: '@owdproject/theme-nova',
          apps: [],
          modules: [],
        }),
      ),
    ).not.toThrow()
  })

  it('rejects non-object exports', () => {
    expect(() => assertValidDesktopUserConfig(null)).toThrow(
      /must default-export a non-array object/,
    )
  })

  it('rejects invalid apps array', () => {
    expect(() =>
      assertValidDesktopUserConfig(defineDesktopConfig({ apps: [1] as unknown as string[] })),
    ).toThrow(/`apps` must be an array of strings/)
  })
})

describe('desktopConfigWritePath', () => {
  it('always targets desktop.config.ts', () => {
    expect(desktopConfigWritePath('/tmp/desktop')).toBe(
      '/tmp/desktop/desktop.config.ts',
    )
  })
})
