import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
)

describe('package export boundary', () => {
  it('does not expose runtime/internal via exports map', () => {
    const exportKeys = Object.keys(pkg.exports ?? {})
    const internalExports = exportKeys.filter((key) =>
      key.includes('runtime/internal'),
    )
    expect(internalExports).toEqual([])
    expect(exportKeys).not.toContain('./runtime/*')
  })

  it('ships kernel contract docs in files', () => {
    expect(pkg.files).toEqual(
      expect.arrayContaining([
        'DESKTOP_KERNEL.md',
        'CHANGELOG.md',
        'MIGRATION_3.4.md',
        'PLAYGROUND.md',
      ]),
    )
  })
})
