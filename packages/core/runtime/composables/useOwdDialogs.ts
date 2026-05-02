import { inject } from 'vue'
import {
  OWD_DIALOG_PROVIDER_KEY,
  createBrowserFallbackDialogProvider,
  type OwdDialogProvider,
} from '../dialogs/owdDialogProvider'

/**
 * Returns the active desktop dialog provider (theme) or a documented browser fallback.
 */
export function useOwdDialogs(): OwdDialogProvider {
  return inject(OWD_DIALOG_PROVIDER_KEY, null) ?? createBrowserFallbackDialogProvider()
}
