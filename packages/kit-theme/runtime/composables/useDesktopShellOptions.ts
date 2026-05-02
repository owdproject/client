import { useAppConfig } from 'nuxt/app'
import { computed } from 'vue'

/**
 * Reads shared desktop shell flags from `appConfig.desktop` (merged from runtime config).
 * Themes use this for taskbar/dock visibility without duplicating `useAppConfig` wiring.
 */
type DesktopAppShape = {
  systemBar?: {
    enabled?: boolean
    position?: string
    startButton?: boolean
  }
}

export function useDesktopShellOptions() {
  const appConfig = useAppConfig()

  const desktop = () => appConfig.desktop as DesktopAppShape | undefined

  const systemBarEnabled = computed(() => desktop()?.systemBar?.enabled)

  const systemBarPosition = computed(() => desktop()?.systemBar?.position)

  const startButtonEnabled = computed(() => desktop()?.systemBar?.startButton)

  return {
    systemBarEnabled,
    systemBarPosition,
    startButtonEnabled,
  }
}
