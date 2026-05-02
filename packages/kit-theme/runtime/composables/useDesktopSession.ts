import { useRouter } from 'nuxt/app'
import { ref } from 'vue'

/**
 * Neutral API for “leave the desktop shell” flows (shutdown animation → start route).
 * Themes keep their own `/start` / `/boot` pages and styling.
 */
const shuttingDown = ref(false)

export function useDesktopSession() {
  const initiateShutdownToStart = () => {
    shuttingDown.value = true

    setTimeout(() => {
      useRouter()
        .push('/start')
        .then(() => {
          shuttingDown.value = false
        })
    }, 2000)
  }

  return {
    shuttingDown,
    initiateShutdownToStart,
  }
}
