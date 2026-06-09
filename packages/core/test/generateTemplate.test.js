import { describe, it, expect } from 'vitest'
import {
  STARTER_DESKTOP_DEPS,
  TEMPLATE_NPM_FALLBACK_VERSIONS,
} from '../bin/lib/generateTemplate.js'
import { fetchLatestVersion } from '../bin/lib/npmVersions.js'

describe('generateTemplate', () => {
  it('uses theme-nova in starter desktop dependencies', () => {
    expect(STARTER_DESKTOP_DEPS).toContain('@owdproject/theme-nova')
    expect(STARTER_DESKTOP_DEPS).not.toContain('@owdproject/theme-win95')
  })

  it('defines an npm fallback for theme-nova until it is published', () => {
    expect(TEMPLATE_NPM_FALLBACK_VERSIONS['@owdproject/theme-nova']).toBe('0.0.1')
  })

  it('resolves theme-nova from npm when published, or null when optional lookup fails', () => {
    const version = fetchLatestVersion('@owdproject/theme-nova', { optional: true })
    expect(version === null || /^\^[\d.]+/.test(version)).toBe(true)
  })
})
