<template>
  <form class="todo-input-form" @submit.prevent="todoAdd">
    <div class="todo-input-form__field">
      <InputText
        v-model="input"
        placeholder="Remember me to-do..."
        autocomplete="off"
        @keydown.enter.prevent="todoAdd"
        @keyup.enter.prevent="todoAdd"
      />
      <Button
        type="submit"
        variant="text"
        class="todo-input-form__submit"
        aria-label="Add to-do"
        title="Add"
      >
        <Icon name="mdi:keyboard-return" />
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const input = ref<string>('')

const emit = defineEmits(['todo-add'])

function todoAdd() {
  const value = input.value.trim()
  if (value === '') {
    return
  }

  emit('todo-add', value)
  input.value = ''
}
</script>

<style scoped lang="scss">
.todo-input-form {
  width: 100%;

  &__field {
    position: relative;
    width: 100%;
  }

  :deep(.p-inputtext) {
    width: 100%;
    min-height: 52px;
    padding-right: 52px;
  }

  &__submit {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 52px;
    min-height: 52px;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;

    &:hover,
    &:focus,
    &:active {
      background: transparent;
      box-shadow: none;
    }
  }
}
</style>
