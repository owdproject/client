import { ref } from 'vue';

type ClipboardOperation = 'copy' | 'cut';

const clipboardPath = ref<string | null>(null);
const clipboardType = ref<ClipboardOperation | null>(null);

export function useClipboardFs() {
  function setClipboard(path: string, type: ClipboardOperation) {
    clipboardPath.value = path;
    clipboardType.value = type;
  }

  function clearClipboard() {
    clipboardPath.value = null;
    clipboardType.value = null;
  }

  return {
    clipboardPath,
    clipboardType,
    setClipboard,
    clearClipboard,
  };
}
