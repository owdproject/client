import spinners from 'cli-spinners'
import logSymbols from 'log-symbols'

/** Same spinner family as ora (dots). */
const DOTS = spinners.dots.frames

export const spinnerFrameCount = DOTS.length

/**
 * @param {'info' | 'ok' | 'error'} [tone]
 */
export function statusPrefix(tone = 'info') {
  if (tone === 'ok') return `${logSymbols.success} `
  if (tone === 'error') return `${logSymbols.error} `
  return ''
}

/**
 * @param {number} frame
 */
export function radarSpinner(frame) {
  return DOTS[frame % DOTS.length]
}

/**
 * @param {number} step
 * @param {number} total
 * @param {number} _frame
 * @param {number} [width]
 */
export function progressTrack(step, total, _frame, width = 16) {
  if (total <= 0) return '░'.repeat(width)
  const ratio = Math.min(1, step / total)
  const filled = Math.round(ratio * width)
  if (filled >= width) return '█'.repeat(width)
  const before = '█'.repeat(filled)
  const after = '░'.repeat(width - filled)
  return `${before}${after}`
}
