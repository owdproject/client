import { useRouter } from 'nuxt/app'
import { ref } from 'vue'

const isShuttingDown = ref(false)

export function useSystemLifecycle() {
  const shutdownSystem = () => {
    isShuttingDown.value = true

    setTimeout(() => {
      useRouter()
        .push('/start')
        .then(() => {
          isShuttingDown.value = false
        })
    }, 2000)
  }

  return {
    isShuttingDown,
    shutdownSystem,
  }
}
