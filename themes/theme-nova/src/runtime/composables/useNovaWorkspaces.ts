import { computed } from 'vue'
import { useAppConfig } from 'nuxt/app'

/** Whether multi-desktop workspaces are enabled for this desktop (appConfig.desktop.workspaces). */
export function useNovaWorkspaces() {
  const appConfig = useAppConfig()

  const enabled = computed(
    () => appConfig.desktop?.workspaces?.enabled === true,
  )

  return { enabled }
}
