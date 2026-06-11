import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  effectiveInstalledSets,
  sortCatalog,
} from '../bin/lib/catalog.js'

const appA = { name: '@owdproject/app-a', shortName: 'app-a', kind: 'app', updatedAt: '2026-01-01' }
const appB = { name: '@owdproject/app-b', shortName: 'app-b', kind: 'app', updatedAt: '2026-06-01' }
const modX = { name: '@owdproject/module-x', shortName: 'module-x', kind: 'module', updatedAt: '2026-03-01' }

describe('effectiveInstalledSets', () => {
  it('merges pending add and remove into effective sets', () => {
    const config = { apps: ['@owdproject/app-a'], modules: [], theme: null }
    const pending = new Map([
      ['@owdproject/app-a', false],
      ['@owdproject/app-b', true],
      ['@owdproject/module-x', true],
    ])
    const effective = effectiveInstalledSets(config, pending, null)
    assert.deepEqual(effective.apps, ['@owdproject/app-b'])
    assert.deepEqual(effective.modules, ['@owdproject/module-x'])
  })
})

describe('sortCatalog installed with pending', () => {
  it('puts effectively installed entries first', () => {
    const config = { apps: ['@owdproject/app-a'], modules: [], theme: null }
    const pending = new Map([['@owdproject/app-b', true]])
    const effective = effectiveInstalledSets(config, pending, null)
    const sorted = sortCatalog([appB, appA, modX], 'installed', effective)
    assert.equal(sorted[0].shortName, 'app-b')
    assert.deepEqual(
      sorted.slice(1).map((e) => e.shortName).sort(),
      ['app-a', 'module-x'],
    )
  })

  it('sorts by name A-Z', () => {
    const sorted = sortCatalog([appB, appA, modX], 'name', null)
    assert.deepEqual(sorted.map((e) => e.shortName), ['app-a', 'app-b', 'module-x'])
  })
})
