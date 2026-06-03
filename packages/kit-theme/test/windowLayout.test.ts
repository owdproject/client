import { describe, it, expect } from 'vitest'
import { computeSnapRect } from '../src/runtime/utils/windowLayout'
import { detectSnapZone } from '../src/runtime/utils/detectSnapZone'

const workArea = { x: 100, y: 50, width: 800, height: 600 }

describe('computeSnapRect', () => {
  it('maximize fills work area', () => {
    expect(computeSnapRect('maximize', workArea)).toEqual({
      x: 100,
      y: 50,
      width: 800,
      height: 600,
    })
  })

  it('left-half uses left column', () => {
    expect(computeSnapRect('left-half', workArea)).toEqual({
      x: 100,
      y: 50,
      width: 400,
      height: 600,
    })
  })

  it('bottom-right uses lower-right quadrant', () => {
    expect(computeSnapRect('bottom-right', workArea)).toEqual({
      x: 500,
      y: 350,
      width: 400,
      height: 300,
    })
  })
})

describe('detectSnapZone', () => {
  it('detects top maximize band', () => {
    expect(detectSnapZone(500, 50, workArea)).toBe('maximize')
  })

  it('detects bottom-half band', () => {
    expect(detectSnapZone(500, 649, workArea)).toBe('bottom-half')
  })

  it('detects top-left corner', () => {
    expect(detectSnapZone(100, 50, workArea)).toBe('top-left')
  })

  it('defers left-half in workspace edge band when requested', () => {
    const originalInnerWidth = globalThis.innerWidth
    Object.defineProperty(globalThis, 'innerWidth', {
      value: 1920,
      configurable: true,
    })
    try {
      expect(
        detectSnapZone(10, 400, workArea, {
          deferSideSnapForWorkspaceEdge: true,
        }),
      ).toBeNull()
    } finally {
      Object.defineProperty(globalThis, 'innerWidth', {
        value: originalInnerWidth,
        configurable: true,
      })
    }
  })

  it('allows left-half away from workspace edge band', () => {
    expect(detectSnapZone(105, 400, workArea)).toBe('left-half')
  })
})
