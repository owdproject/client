<script setup lang="ts">
import { ref, nextTick } from 'vue'

defineEmits(['remove'])

const props = defineProps({
  todo: Object,
})

const todoTitleDraft = ref<string>(props.todo.title)
const isEditing = ref(false)

/**
 * Edit to-do on double-click
 */
function onTodoDblClickEdit(e) {
  if (!isEditing.value) {
    onTodoEdit(e)
  }
}

/**
 * Edit to-do
 */
function onTodoEdit(e?) {
  isEditing.value = !isEditing.value

  if (isEditing.value && e) {
    const liElement = e.target.closest('li')

    // focus input
    nextTick(() => liElement.querySelector('input[type="text"]').focus())
  }
}

/**
 * Confirm to-do edit
 */
function onTodoEditConfirm() {
  if (props.todo.title.trim() === '') {
    return
  }

  props.todo.title = todoTitleDraft.value
  isEditing.value = false
}

/**
 * Restore original to-do value
 */
function onTodoEditCancel() {
  if (props.todo.title.trim() === '') {
    return
  }

  todoTitleDraft.value = props.todo.title
  isEditing.value = false
}
</script>

<template>
  <li :class="{ editing: isEditing, completed: props.todo.completed }">
    <div class="todo-list__checkbox flex items-center">
      <Checkbox binary v-model="todo.completed" />
    </div>

    <div clasS="todo-list__input">
      <InputText
        v-if="isEditing"
        v-model="todoTitleDraft"
        placeholder="empty"
        autocomplete="false"
        spellcheck="false"
        @keyup.esc="onTodoEditCancel"
        @keyup.enter="onTodoEditConfirm"
        @dblclick="onTodoDblClickEdit"
      />
      <span
        v-else
        class="ellipse pl-1"
        v-text="props.todo.title"
        @dblclick="onTodoEdit"
      />
    </div>

    <div class="todo-list__actions flex items-center">
      <ButtonGroup>
        <Button class="btn-edit" @click="onTodoEdit">
          <Icon name="mdi:pencil" v-if="!isEditing" />
          <Icon name="mdi:content-save" v-else />
        </Button>

        <Button class="btn-remove" @click="$emit('remove')">
          <Icon name="mdi:window-close" />
        </Button>
      </ButtonGroup>
    </div>
  </li>
</template>

<style scoped lang="scss">
li {
  display: flex;
  flex-direction: row;
  margin: 8px 0;

  .todo-list__checkbox {
    height: auto;
  }

  .todo-list__input {
    flex: 1;
    align-content: center;
  }
}
</style>
