import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  padCell,
  selectionMarker,
  sourceSlots,
  formatCatalogRowPlain,
  formatLegendLine,
} from '../bin/lib/tuiFormat.js'

describe('tuiFormat', () => {
  it('padCell truncates and pads', () => {
    assert.equal(padCell('hi', 5), 'hi   ')
    assert.equal(padCell('toolongname', 4), 'tool')
  })

  it('selectionMarker reflects pending and installed', () => {
    assert.equal(selectionMarker({ pending: true, installed: false }), '[+]')
    assert.equal(selectionMarker({ pending: false, installed: true }), '[-]')
    assert.equal(selectionMarker({ installed: true }), '[*]')
    assert.equal(selectionMarker({ installed: false }), '[ ]')
  })

  it('sourceSlots shows NPM GIT LOC when available', () => {
    const slots = sourceSlots({
      sourcesMeta: { npm: { version: '^1.0.0' } },
      htmlUrl: 'https://github.com/owdproject/app-a',
      localSource: true,
    })
    assert.equal(slots.npm, 'NPM')
    assert.equal(slots.git, 'GIT')
    assert.equal(slots.loc, 'LOC')
  })

  it('formatCatalogRowPlain includes package name and source columns', () => {
    const row = formatCatalogRowPlain({
      shortName: 'app-about',
      pending: true,
      installed: false,
      sourcesMeta: { npm: { version: '^0.1.0' } },
      htmlUrl: 'https://github.com/owdproject/app-about',
      org: 'owdproject',
      stars: 12,
      updatedAt: '2026-06-01',
      trusted: true,
    })
    assert.match(row, /app-about/)
    assert.match(row, /NPM/)
    assert.match(row, /GIT/)
    assert.match(row, /\[.*?\+.*?\]/)
  })

  it('formatLegendLine documents markers', () => {
    const legend = formatLegendLine()
    assert.match(legend, /\[\+\]/)
    assert.match(legend, /NPM/)
    assert.match(legend, /MISS/)
  })

  it('formatCatalogRowPlain renders update badge when packageUpdates has update', () => {
    const row = formatCatalogRowPlain({
      shortName: 'app-about',
      pending: null,
      installed: true,
      sourcesMeta: {},
      htmlUrl: 'https://github.com/owdproject/app-about',
      org: 'owdproject',
      stars: 0,
      updatedAt: '2026-06-01',
      trusted: true,
    }, {
      packageUpdates: new Map([
        ['app-about', { hasUpdate: true, behindCount: 3 }]
      ])
    })
    assert.match(row, /app-about.*?↑3/)
  })

  it('formatCatalogRowPlain renders changes column when localGitChanges has modifications', () => {
    const row = formatCatalogRowPlain({
      shortName: 'app-about',
      pending: null,
      installed: true,
      sourcesMeta: {},
      htmlUrl: 'https://github.com/owdproject/app-about',
      org: 'owdproject',
      stars: 0,
      updatedAt: '2026-06-01',
      trusted: true,
      localSource: true,
    }, {
      columns: { sel: 3, name: 20, sources: 7, dir: 4, changes: 8, publisher: 15, meta: 14 },
      localGitChanges: new Map([
        ['app-about', { added: 1, modified: 2, deleted: 0 }]
      ])
    })
    assert.match(row, /\+1/)
    assert.match(row, /~2/)
  })
})
