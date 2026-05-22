import { ref } from "vue";

export function useFileSystemDirectorySelection() {
  const selectedItems = ref<string[]>([]);

  function onSelect(e: any) {
    e.added.forEach((el: HTMLElement) => {
      const path = el.getAttribute('data-path');
      if (path && !selectedItems.value.includes(path)) {
        selectedItems.value.push(path);
        el.classList.add('selected');
      }
    });
    e.removed.forEach((el: HTMLElement) => {
      const path = el.getAttribute('data-path');
      if (path) {
        selectedItems.value = selectedItems.value.filter(p => p !== path);
        el.classList.remove('selected');
      }
    });
  }

  function selectAll(items: string[]) {
    selectedItems.value = [...items];
  }

  function clearSelection() {
    selectedItems.value = [];
  }

  return {
    selectedItems,
    onSelect,
    selectAll,
    clearSelection,
  };
}
