import { watchEffect } from 'vue'
import { useMagicKeys } from '@vueuse/core'

export function useFileSystemKeyboardActions(
  owdWindow: IWindowController,
  actions: {
    onDelete?: (toTrash: boolean) => void,
    onCopy?: () => void,
    onCut?: () => void,
    onPaste?: () => void
  }
) {
  const keys = useMagicKeys()

  watchEffect(() => {
    if (owdWindow.state.focused) {
      // delete
      if (keys.delete.value) {
        actions.onDelete(!keys.shift.value)
      }

      // copy
      if (keys.v.value && keys.ctrl.value) {
        actions.onCopy()
      }

      // cut
      if (keys.x.value && keys.ctrl.value) {
        actions.onCopy()
      }

      // paste
      if (keys.v.value && keys.ctrl.value) {
        actions.onPaste()
      }
    }
  })
}
