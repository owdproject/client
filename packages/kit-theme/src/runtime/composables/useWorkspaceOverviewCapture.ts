import { useDebounceFn } from '@vueuse/core'
import { nextTick, ref, shallowRef, watch } from 'vue'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { captureElementToCanvas } from '../utils/captureElementToCanvas'

export type WorkspaceRootResolver = (
  workspaceId: string,
) => HTMLElement | null | undefined

export type UseWorkspaceOverviewCaptureOptions = {
  /** Delay before capturing after overview opens (ms). Default 150. */
  debounceMs?: number
  /** JPEG quality for thumbnail data URLs (0–1). Default 0.7. */
  jpegQuality?: number
  /** Passed through to html2canvas. */
  captureOptions?: Record<string, unknown>
}

/**
 * Captures workspace desktop roots as JPEG data URLs while workspace overview is open.
 * Themes supply a resolver that maps each workspace id to its DOM root (e.g. a layer wrapping
 * {@link DesktopApplicationRender} with `workspace-filter`).
 */
export function useWorkspaceOverviewCapture(
  resolveWorkspaceRoot: WorkspaceRootResolver,
  options: UseWorkspaceOverviewCaptureOptions = {},
) {
  const desktopWorkspaceStore = useDesktopWorkspaceStore()
  const thumbnails = shallowRef(new Map<string, string>())
  const isCapturing = ref(false)

  const debounceMs = options.debounceMs ?? 150
  const jpegQuality = options.jpegQuality ?? 0.7

  async function captureWorkspace(workspaceId: string): Promise<string | null> {
    const element = resolveWorkspaceRoot(workspaceId)
    const canvas = await captureElementToCanvas(element, options.captureOptions)
    if (!canvas) return null
    return canvas.toDataURL('image/jpeg', jpegQuality)
  }

  async function refreshThumbnails() {
    if (!desktopWorkspaceStore.overview) return

    isCapturing.value = true
    const next = new Map<string, string>()

    try {
      await nextTick()
      const ids = [...desktopWorkspaceStore.list]
      await Promise.all(
        ids.map(async (id) => {
          const dataUrl = await captureWorkspace(id)
          if (dataUrl) next.set(id, dataUrl)
        }),
      )
      thumbnails.value = next
    } finally {
      isCapturing.value = false
    }
  }

  const scheduleRefresh = useDebounceFn(() => {
    void refreshThumbnails()
  }, debounceMs)

  watch(
    () => desktopWorkspaceStore.overview,
    (open) => {
      if (open) scheduleRefresh()
      else thumbnails.value = new Map()
    },
  )

  watch(
    () => desktopWorkspaceStore.list.join('\0'),
    () => {
      if (desktopWorkspaceStore.overview) scheduleRefresh()
    },
  )

  function thumbnailFor(workspaceId: string): string | undefined {
    return thumbnails.value.get(workspaceId)
  }

  return {
    thumbnails,
    isCapturing,
    refreshThumbnails,
    thumbnailFor,
  }
}
