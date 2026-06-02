import { inject } from 'vue'

/** True after `desktop-shell-init` has bound Pinia and run kernel workspace bootstrap. */
export function useDesktopShellReady() {
  return inject('desktopShellReady', false)
}
