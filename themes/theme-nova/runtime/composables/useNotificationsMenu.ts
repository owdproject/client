import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { ref } from 'vue'

const enabled = ref(false)

export function useNotificationsMenu() {
    const applicationManager = useApplicationManager()

    return {
        enabled,
    }
}
