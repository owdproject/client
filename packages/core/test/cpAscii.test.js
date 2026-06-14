import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import spinners from 'cli-spinners'
import {
  radarSpinner,
  progressTrack,
  statusPrefix,
} from '../bin/lib/cpAscii.js'

describe('cpAscii', () => {
  it('radarSpinner uses cli-spinners dots frames', () => {
    assert.equal(radarSpinner(0), spinners.dots.frames[0])
    assert.equal(radarSpinner(1), spinners.dots.frames[1])
  })

  it('statusPrefix adds glyphs for ok and error', () => {
    assert.match(statusPrefix('ok'), /✔/)
    assert.match(statusPrefix('error'), /✖/)
    assert.equal(statusPrefix('info'), '')
  })

  it('progressTrack fills proportionally', () => {
    assert.equal(progressTrack(0, 4, 0).length, 16)
    assert.match(progressTrack(4, 4, 0), /^█+$/)
  })
})
