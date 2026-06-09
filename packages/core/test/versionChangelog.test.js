import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8'),
)
const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8')

describe('release metadata', () => {
  it('matches package.json version with latest CHANGELOG section', () => {
    const match = changelog.match(/^## (\d+\.\d+\.\d+)/m)
    expect(match).not.toBeNull()
    expect(match[1]).toBe(pkg.version)
  })
})
