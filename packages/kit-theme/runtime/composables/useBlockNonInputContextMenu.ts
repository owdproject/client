import { onMounted, onUnmounted } from 'vue'
import { isDebugMode } from '@owdproject/core/runtime/utils/utilDebug'

/**
 * Blocks the browser context menu on non-input elements (typical desktop shell behaviour).
 * Debug builds skip blocking so DevTools stay usable when {@link isDebugMode} is true.
 */
export function useBlockNonInputContextMenu() {
  const handler = (event: MouseEvent) => {
    if (isDebugMode()) return

    const target = event.target as HTMLElement | null
    if (!target) return

    const tag = target.tagName?.toLowerCase()
    const isInput =
      tag === 'input' ||
      tag === 'textarea' ||
      Boolean(target.isContentEditable)

    if (!isInput) {
      event.preventDefault()
    }
  }

  onMounted(() => {
    document.addEventListener('contextmenu', handler)
  })

  onUnmounted(() => {
    document.removeEventListener('contextmenu', handler)
  })
}
