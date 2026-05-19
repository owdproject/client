<template>
  <InputText
    placeholder="Remember me to-do..."
    @keyup.enter="todoAdd"
    v-model="input"
  />
</template>

<script setup lang="ts">
import { ref } from '@vue/reactivity'

const input = ref<string>('')

const emit = defineEmits(['todo-add'])

function todoAdd() {
  emit('todo-add', input.value)
  input.value = ''
}
</script>

<style scoped lang="scss">
.p-inputtext {
  min-height: 52px;
  width: 100%;
}
</style>
