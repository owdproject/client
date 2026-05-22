import { useMediaQuery } from '@vueuse/core'

/** Breakpoints for Nova top-bar tray (aligned with launcher at 768px). */
export const NOVA_TRAY_BP = {
  /** Overflow menu: workspace, battery, volume, wifi move into “More”. */
  compact: '(max-width: 599px)',
  /** Hide clock date, battery percentage label. */
  narrow: '(max-width: 719px)',
  /** Hide Wi‑Fi stub control. */
  medium: '(max-width: 899px)',
} as const

export function useNovaTrayLayout() {
  const isCompact = useMediaQuery(NOVA_TRAY_BP.compact)
  const isNarrow = useMediaQuery(NOVA_TRAY_BP.narrow)
  const isMedium = useMediaQuery(NOVA_TRAY_BP.medium)

  return { isCompact, isNarrow, isMedium }
}
