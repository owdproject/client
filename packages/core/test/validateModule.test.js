import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  validateOwdModule,
  inferModuleKind,
  formatValidationReport,
  discoverOwdModulePackages,
  findModulePackageRoot,
  isDesktopCorePackage,
  findLegacyModuleMetaName,
  findLegacyPiniaStoreIdSnippets,
} from '../bin/lib/validateModule.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = join(__dirname, 'fixtures/validate-module')
const clientRoot = join(__dirname, '../../..')
const corePackageDir = join(__dirname, '..')
const appAboutDir = join(clientRoot, 'apps/app-about')
const hasAppAbout = existsSync(join(appAboutDir, 'package.json'))

describe('3.4 legacy naming detectors', () => {
  it('detects legacy module meta.name', () => {
    expect(
      findLegacyModuleMetaName(`export default defineNuxtModule({
  meta: { name: 'owd-app-about' },
})`),
    ).toBe('owd-app-about')
    expect(
      findLegacyModuleMetaName(`export default defineNuxtModule({
  meta: { name: 'desktop-app-about' },
})`),
    ).toBeNull()
  })

  it('detects legacy Pinia store ids', () => {
    const snippets = findLegacyPiniaStoreIdSnippets(`
      export const useFooStore = defineStore('owd/desktop/foo', () => ({}))
      const id = \`owd/application/\${appId}/windows\`
    `)
    expect(snippets.some((s) => s.includes("defineStore('owd/desktop/foo'"))).toBe(
      true,
    )
    expect(snippets.some((s) => s.includes('owd/application/${appId}/windows'))).toBe(
      true,
    )
  })
})

describe('inferModuleKind', () => {
  it('classifies app, theme, and module names', () => {
    expect(inferModuleKind('@owdproject/app-about')).toBe('app')
    expect(inferModuleKind('@owdproject/theme-nova')).toBe('theme')
    expect(inferModuleKind('@owdproject/module-docs')).toBe('module')
  })
})

describe('validateOwdModule fixtures', () => {
  beforeAll(() => {
    const validDir = join(fixtures, 'valid')
    const distModule = join(validDir, 'dist/module.mjs')
    if (!existsSync(distModule)) {
      const coreRoot = join(__dirname, '..')
      const bin = join(coreRoot, '../../node_modules/.bin')
      execSync('nuxt-module-build build --stub', {
        cwd: validDir,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        stdio: 'pipe',
      })
    }
  })

  it('passes a minimal valid app fixture (warnings allowed)', () => {
    const dir = join(fixtures, 'valid')
    const result = validateOwdModule(dir, { workspaceRoot: null, checkWorkspace: false })
    expect(result.ok).toBe(true)
    expect(result.kind).toBe('app')
    expect(result.errors).toHaveLength(0)
  })

  it('fails legacy root layout', () => {
    const dir = join(fixtures, 'legacy-invalid')
    const result = validateOwdModule(dir, { workspaceRoot: null, checkWorkspace: false })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.code === 'legacy-module-root')).toBe(true)
    expect(result.errors.some((e) => e.code === 'src-module')).toBe(true)
  })

  it('formats a readable report', () => {
    const result = validateOwdModule(join(fixtures, 'legacy-invalid'), {
      workspaceRoot: null,
      checkWorkspace: false,
    })
    const text = formatValidationReport(result)
    expect(text).toContain('FAIL')
    expect(text).toContain('legacy-module-root')
  })
})

describe('monorepo integration', () => {
  it('treats @owdproject/core as exempt from playground playbook', () => {
    expect(isDesktopCorePackage('@owdproject/core')).toBe(true)
    expect(isDesktopCorePackage('@owdproject/app-about')).toBe(false)
  })

  it('excludes @owdproject/core from discoverOwdModulePackages', () => {
    const discovered = discoverOwdModulePackages(clientRoot)
    expect(discovered.some((p) => p.endsWith('packages/core'))).toBe(false)
  })

  it('validates @owdproject/core without a playground', () => {
    const result = validateOwdModule(corePackageDir, {
      workspaceRoot: clientRoot,
      requireDist: true,
    })
    expect(result.pkgName).toBe('@owdproject/core')
    expect(result.ok).toBe(true)
  })

  it.skipIf(!hasAppAbout)('validates apps/app-about against the playbook', () => {
    const result = validateOwdModule(appAboutDir, { workspaceRoot: clientRoot })
    if (!result.ok) {
      console.log(formatValidationReport(result))
    }
    expect(result.pkgName).toBe('@owdproject/app-about')
    expect(result.ok).toBe(true)
  })

  it.skipIf(!hasAppAbout)('finds package root from apps/app-about subdirectory', () => {
    const root = findModulePackageRoot(join(appAboutDir, 'playground'))
    expect(root).toBe(appAboutDir)
  })
})
