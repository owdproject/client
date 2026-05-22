import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  validateOwdModule,
  inferModuleKind,
  formatValidationReport,
  discoverOwdModulePackages,
  findModulePackageRoot,
} from '../bin/lib/validateModule.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtures = join(__dirname, 'fixtures/validate-module')
const clientRoot = join(__dirname, '../../..')

describe('inferModuleKind', () => {
  it('classifies app, theme, and module names', () => {
    expect(inferModuleKind('@owdproject/app-about')).toBe('app')
    expect(inferModuleKind('@owdproject/theme-nova')).toBe('theme')
    expect(inferModuleKind('@owdproject/module-docs')).toBe('module')
  })
})

describe('validateOwdModule fixtures', () => {
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
  it('discovers app-about in the client workspace', () => {
    const discovered = discoverOwdModulePackages(clientRoot)
    expect(discovered.some((p) => p.endsWith('apps/app-about'))).toBe(true)
  })

  it('validates apps/app-about against the playbook', () => {
    const appAbout = join(clientRoot, 'apps/app-about')
    const result = validateOwdModule(appAbout, { workspaceRoot: clientRoot })
    if (!result.ok) {
      console.log(formatValidationReport(result))
    }
    expect(result.pkgName).toBe('@owdproject/app-about')
    expect(result.ok).toBe(true)
  })

  it('finds package root from apps/app-about subdirectory', () => {
    const root = findModulePackageRoot(join(clientRoot, 'apps/app-about/playground'))
    expect(root).toBe(join(clientRoot, 'apps/app-about'))
  })
})
