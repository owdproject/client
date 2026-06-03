import type { DesktopWorkAreaRect, WindowLayout } from '@owdproject/core'
import { workAreaBottom, workAreaRight } from './windowLayout'
import { WORKSPACE_EDGE_DROP_PX } from '../composables/useWorkspaceEdgeDrop'

/** Viewport band (px) where a window drag targets a snap zone. */
export const WINDOW_SNAP_EDGE_PX = 14

export type SnapZoneHint = Exclude<WindowLayout, 'normal'>

export type DetectSnapZoneOptions = {
  edgePx?: number
  /** When true, left/right half snap is suppressed in the outer workspace-edge band. */
  deferSideSnapForWorkspaceEdge?: boolean
}

/**
 * Resolve snap zone from pointer position and shell work area.
 * Returns null when the pointer is not in a snap band.
 */
export function detectSnapZone(
  clientX: number,
  clientY: number,
  workArea: DesktopWorkAreaRect,
  options?: DetectSnapZoneOptions,
): SnapZoneHint | null {
  const edge = options?.edgePx ?? WINDOW_SNAP_EDGE_PX
  const { x, y, width, height } = workArea

  if (width <= 0 || height <= 0) {
    return null
  }

  const bottom = workAreaBottom(workArea)
  const right = workAreaRight(workArea)

  const nearTop = clientY <= y + edge
  const nearBottom = clientY >= bottom - edge
  const nearLeft = clientX <= x + edge
  const nearRight = clientX >= right - edge

  const inWorkspaceEdgeBand =
    options?.deferSideSnapForWorkspaceEdge === true &&
    typeof globalThis !== 'undefined' &&
    (clientX <= WORKSPACE_EDGE_DROP_PX ||
      clientX >= globalThis.innerWidth - WORKSPACE_EDGE_DROP_PX)

  if (nearTop && nearLeft) return 'top-left'
  if (nearTop && nearRight) return 'top-right'
  if (nearBottom && nearLeft) return 'bottom-left'
  if (nearBottom && nearRight) return 'bottom-right'
  if (nearTop) return 'maximize'
  if (nearBottom) return 'bottom-half'
  if (nearLeft && !inWorkspaceEdgeBand) return 'left-half'
  if (nearRight && !inWorkspaceEdgeBand) return 'right-half'

  return null
}
