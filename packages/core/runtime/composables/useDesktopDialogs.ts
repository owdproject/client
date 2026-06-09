import { inject } from 'vue'
import { DESKTOP_DIALOG_PROVIDER_KEY } from '../constants/desktopShellKeys'
import {
  createBrowserFallbackDialogProvider,
  type DesktopDialogProvider,
} from '../dialogs/desktopDialogProvider'

/**
 * Returns the active desktop dialog provider (theme) or a browser fallback.
 */
export function useDesktopDialogs(): DesktopDialogProvider {
  return (
    inject(DESKTOP_DIALOG_PROVIDER_KEY, null) ??
    createBrowserFallbackDialogProvider()
  )
}
