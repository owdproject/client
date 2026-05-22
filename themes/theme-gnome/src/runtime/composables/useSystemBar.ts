import { ref, computed } from 'vue'
import { useAppConfig } from 'nuxt/app'

export function useSystemBar() {
  const appConfig = useAppConfig()

  const enabled = computed(() => {
    return appConfig.desktop?.systemBar?.enabled
  })

  const position = computed(() => {
    return appConfig.desktop?.systemBar?.position
  })

  return {
    enabled,
    position,
  }
}
