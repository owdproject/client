import { useApplicationMetaStore } from '@owdproject/core/runtime/stores/storeApplicationMeta'
import { ref } from '@vue/reactivity'

const filter = ref<string>('all')
const list = ref<string[]>([])

export const useTodoStore = useApplicationMetaStore('org.owdproject.todo', {
  filter,
  list,
})
