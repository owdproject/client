import { useNuxtApp } from 'nuxt/app'

/** True after `desktop-shell-init` has bound Pinia and run kernel workspace bootstrap. */
export function useDesktopShellReady() {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$desktopShellReady === true
}
