import { describe, it, expect } from 'vitest'
import { computeScaleToFit } from '../src/runtime/composables/useWorkspaceOverviewLiveScale'

describe('computeScaleToFit', () => {
  it('fits by the limiting axis', () => {
    expect(computeScaleToFit(300, 200, 600, 400)).toBe(0.5)
    expect(computeScaleToFit(400, 150, 800, 600)).toBeCloseTo(0.25)
  })

  it('caps at maxScale when provided', () => {
    expect(computeScaleToFit(1200, 900, 600, 400, { maxScale: 1 })).toBe(1)
  })

  it('returns 1 for invalid dimensions', () => {
    expect(computeScaleToFit(0, 200, 600, 400)).toBe(1)
    expect(computeScaleToFit(300, 200, 0, 400)).toBe(1)
  })
})
