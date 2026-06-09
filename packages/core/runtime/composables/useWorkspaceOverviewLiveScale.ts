import type { CSSProperties, Ref } from 'vue'
import {
  nextTick,
  onScopeDispose,
  readonly,
  shallowRef,
  watch,
} from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'

export type WorkspaceStageSize = {
  width: number
  height: number
}

export type WorkspaceOverviewLiveScaleOptions = {
  /** Upper bound for scale (default 1). */
  maxScale?: number
}

export type WorkspaceOverviewInnerStyleOptions =
  WorkspaceOverviewLiveScaleOptions & {
    transformOrigin?: string
  }

/**
 * Fit factor to show a 1:1 shell stage inside a panel viewport without clipping.
 */
export function computeScaleToFit(
  panelWidth: number,
  panelHeight: number,
  stageWidth: number,
  stageHeight: number,
  options?: WorkspaceOverviewLiveScaleOptions,
): number {
  if (
    panelWidth <= 0 ||
    panelHeight <= 0 ||
    stageWidth <= 0 ||
    stageHeight <= 0
  ) {
    return 1
  }

  const scale = Math.min(panelWidth / stageWidth, panelHeight / stageHeight)
  const maxScale = options?.maxScale ?? 1
  return Math.min(scale, maxScale)
}

/**
 * Live DOM workspace overview: measure shell stage, scale desktop roots to fit cards.
 */
export function useWorkspaceOverviewLiveScale(
  shellStageRef: Ref<HTMLElement | null | undefined>,
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const stageSize = shallowRef<WorkspaceStageSize>({ width: 0, height: 0 })

  let resizeObserver: ResizeObserver | null = null

  function readStageSize() {
    const el = shellStageRef.value
    if (!el) {
      stageSize.value = { width: 0, height: 0 }
      return
    }
    stageSize.value = {
      width: el.clientWidth,
      height: el.clientHeight,
    }
  }

  function stopObserving() {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  function startObserving() {
    stopObserving()
    const el = shellStageRef.value
    if (!el || typeof ResizeObserver === 'undefined') return

    readStageSize()
    resizeObserver = new ResizeObserver(() => readStageSize())
    resizeObserver.observe(el)
  }

  watch(
    () => desktopWorkspaceStore.overview,
    (open) => {
      if (open) {
        void nextTick(() => startObserving())
      } else {
        stopObserving()
        stageSize.value = { width: 0, height: 0 }
      }
    },
  )

  watch(shellStageRef, (el) => {
    if (desktopWorkspaceStore.overview && el) {
      void nextTick(() => startObserving())
    }
  })

  onScopeDispose(stopObserving)

  function scaleToFit(
    panelEl: HTMLElement | null | undefined,
    options?: WorkspaceOverviewLiveScaleOptions,
  ): number {
    if (!panelEl) return 1
    const { width: stageWidth, height: stageHeight } = stageSize.value
    if (stageWidth <= 0 || stageHeight <= 0) return 1

    return computeScaleToFit(
      panelEl.clientWidth,
      panelEl.clientHeight,
      stageWidth,
      stageHeight,
      options,
    )
  }

  function innerOverviewStyle(
    panelEl: HTMLElement | null | undefined,
    options?: WorkspaceOverviewInnerStyleOptions,
  ): CSSProperties | undefined {
    if (!desktopWorkspaceStore.overview) return undefined

    const { width: stageWidth, height: stageHeight } = stageSize.value
    if (stageWidth <= 0 || stageHeight <= 0) return undefined

    const scale = scaleToFit(panelEl, options)
    const transformOrigin = options?.transformOrigin ?? 'top left'

    return {
      width: `${stageWidth}px`,
      height: `${stageHeight}px`,
      transform: `scale(${scale})`,
      transformOrigin,
    }
  }

  return {
    stageSize: readonly(stageSize),
    scaleToFit,
    innerOverviewStyle,
    refreshStageSize: readStageSize,
  }
}
