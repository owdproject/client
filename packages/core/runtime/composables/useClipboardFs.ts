import { ref } from 'vue'

type ClipboardOperation = 'copy' | 'cut'

const clipboardFiles = ref<string[]>([])
const clipboardType = ref<ClipboardOperation | null>(null)

export function useClipboardFs() {
  function setClipboard(paths: string[], type: ClipboardOperation) {
    clipboardFiles.value = paths
    clipboardType.value = type
  }

  function clearClipboard() {
    clipboardFiles.value = []
    clipboardType.value = null
  }

  return {
    clipboardFiles,
    clipboardType,
    setClipboard,
    clearClipboard,
  }
}
