import { ref } from 'vue'

export function useFileSystemDirectoryNavigation(initialPath: string) {
  const history = ref<string[]>([initialPath])
  const currentIndex = ref(0)

  function push(path: string) {
    if (currentIndex.value < history.value.length - 1) {
      history.value.splice(currentIndex.value + 1)
    }
    history.value.push(path)
    currentIndex.value++
  }

  function back(): string | null {
    if (currentIndex.value > 0) {
      currentIndex.value--
      return history.value[currentIndex.value]
    }
    return null
  }

  function forward(): string | null {
    if (currentIndex.value < history.value.length - 1) {
      currentIndex.value++
      return history.value[currentIndex.value]
    }
    return null
  }

  function canGoBack() {
    return currentIndex.value > 0
  }

  function canGoForward() {
    return currentIndex.value < history.value.length - 1
  }

  return {
    history,
    push,
    back,
    forward,
    canGoBack,
    canGoForward,
  }
}
