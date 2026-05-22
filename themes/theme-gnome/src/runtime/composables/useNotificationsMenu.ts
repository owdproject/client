import { ref } from 'vue'
import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'

const enabled = ref(false)

export function useNotificationsMenu() {
  const applicationManager = useApplicationManager()

  return {
    enabled,
  }
}
