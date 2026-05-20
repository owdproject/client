import { ref } from 'vue'

const open = ref(false)

export function useNovaQuickSettings() {
  function close() {
    open.value = false
  }

  function toggle() {
    open.value = !open.value
  }

  return {
    open,
    close,
    toggle,
  }
}
