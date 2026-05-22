import { useApplicationMetaStore } from '@owdproject/core/runtime/stores/storeApplicationMeta'
import { nanoid } from 'nanoid'
import { ref } from 'vue'
import type { Ref } from 'vue'

export interface TodoItem {
  id: string
  title: string
  completed: boolean
  editing: boolean
}

function normalizeList(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized: TodoItem[] = []

  for (const item of value) {
    if (typeof item === 'string' && item.trim() !== '') {
      normalized.push({
        id: nanoid(8),
        title: item,
        completed: false,
        editing: false,
      })
      continue
    }

    if (
      item &&
      typeof item === 'object' &&
      'title' in item &&
      typeof (item as TodoItem).title === 'string'
    ) {
      const row = item as TodoItem
      normalized.push({
        id: row.id ?? nanoid(8),
        title: row.title,
        completed: Boolean(row.completed),
        editing: Boolean(row.editing),
      })
    }
  }

  return normalized
}

function ensureList(list: Ref<TodoItem[]>) {
  if (!Array.isArray(list.value)) {
    list.value = []
    return
  }

  if (list.value.length > 0 && typeof list.value[0] === 'string') {
    list.value = normalizeList(list.value)
  }
}

export const useTodoStore = useApplicationMetaStore('org.owdproject.todo', () => {
  const filter = ref<string>('all')
  const list = ref<TodoItem[]>([])

  ensureList(list)

  function addTodo(title: string) {
    const trimmed = title.trim()
    if (trimmed === '') {
      return
    }

    ensureList(list)

    list.value.push({
      id: nanoid(8),
      title: trimmed,
      completed: false,
      editing: false,
    })

    if (filter.value === 'done') {
      filter.value = 'all'
    }
  }

  function removeTodo(todoId: string) {
    ensureList(list)
    const index = list.value.findIndex((item) => item.id === todoId)
    if (index === -1) {
      return
    }

    list.value.splice(index, 1)
  }

  return {
    filter,
    list,
    addTodo,
    removeTodo,
  }
})
