import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  splitDesktopUserConfig,
  DESKTOP_MODULE_KEYS,
} from '../runtime/utils/splitDesktopUserConfig'

describe('splitDesktopUserConfig', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('extracts theme, apps, modules without merging them into desktopRuntime', () => {
    const result = splitDesktopUserConfig({
      theme: '@owdproject/theme-nova',
      apps: ['@owdproject/app-about'],
      modules: ['@owdproject/module-fs'],
      workspaces: { enabled: true },
    })

    expect(result.theme).toBe('@owdproject/theme-nova')
    expect(result.apps).toEqual(['@owdproject/app-about'])
    expect(result.modules).toEqual(['@owdproject/module-fs'])
    expect(result.desktopRuntime).toEqual({ workspaces: { enabled: true } })
    expect(result.desktopRuntime.theme).toBeUndefined()
  })

  it('warns when a key looks like a Nuxt option', () => {
    splitDesktopUserConfig({ ssr: false, name: 'Desktop' })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('ssr'),
    )
  })

  it('warns on unknown desktop keys but still merges them', () => {
    const result = splitDesktopUserConfig({ customFlag: true })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('customFlag'),
    )
    expect(result.desktopRuntime.customFlag).toBe(true)
  })

  it('keeps explorer in desktopRuntime for kit-fs consumers', () => {
    const result = splitDesktopUserConfig({
      explorer: { mountLabels: { '/': 'Root' } },
    })

    expect(result.desktopRuntime.explorer).toEqual({
      mountLabels: { '/': 'Root' },
    })
  })

  it('module keys constant matches install order fields', () => {
    expect(DESKTOP_MODULE_KEYS).toEqual(['theme', 'apps', 'modules'])
  })
})
