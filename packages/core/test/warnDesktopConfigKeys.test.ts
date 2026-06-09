import { describe, it, expect, vi, beforeEach } from 'vitest'
import { warnDesktopConfigKeys } from '../kit/authoring'

describe('warnDesktopConfigKeys', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  it('warns when a key looks like a Nuxt option', () => {
    warnDesktopConfigKeys({ ssr: false, name: 'Desktop' })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('ssr'),
    )
  })

  it('does not warn on extension keys (fs, terminal, custom)', () => {
    warnDesktopConfigKeys({
      fs: { mounts: {} },
      terminal: { prompt: '$' },
      myApp: { flag: true },
      name: 'nova',
    })

    expect(console.warn).not.toHaveBeenCalled()
  })
})
