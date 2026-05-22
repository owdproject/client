<script setup lang="ts">
import { useTodoStore } from '../../stores/storeTodo'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

const todoStore = useTodoStore()
const { list, filter } = storeToRefs(todoStore)

const todoCount = computed(() => list.value.length)
const todoCountCompleted = computed(
  () => list.value.filter((item) => item.completed).length,
)
const todoCountNotCompleted = computed(
  () => list.value.filter((item) => !item.completed).length,
)

const todoListFiltered = computed(() => {
  return [...list.value]
    .sort((a, b) => +b.completed - +a.completed)
    .filter(function (item) {
      switch (filter.value) {
        case 'todo':
          return item.completed === false
        case 'done':
          return item.completed === true
        default:
          return true
      }
    })
})

function todoAdd(item: string) {
  todoStore.addTodo(item)
}

/**
 * Remove to-do
 */
function onTodoRemove(todoId: string) {
  if (confirm('Are you sure to remove this item?') !== true) {
    return
  }

  todoStore.removeTodo(todoId)
}
</script>

<template>
  <Window :content="{ padded: true }">
    <div class="todo-container">
      <div class="todo-input">
        <TodoInput @todo-add="todoAdd" />
      </div>

      <div class="todo-list">
        <ul>
          <template v-for="todo in todoListFiltered" :key="todo.id">
            <TodoListItem :todo="todo" @remove="onTodoRemove(todo.id)" />
          </template>
        </ul>
      </div>

      <ul class="todo-stats">
        <li>To do: {{ todoCountNotCompleted }}</li>
        <li v-if="todoCount > 0">
          Completed: {{ todoCountCompleted }} / {{ todoCount }}
        </li>
        <li>
          <a
            :class="[{ 'opacity-50': filter !== 'all' }]"
            @click="filter = 'all'"
            >all</a
          >
          <a
            :class="[{ 'opacity-50': filter !== 'todo' }]"
            @click="filter = 'todo'"
            >to do</a
          >
          <a
            :class="[{ 'opacity-50': filter !== 'done' }]"
            @click="filter = 'done'"
            >done</a
          >
        </li>
      </ul>
    </div>
  </Window>
</template>

<style scoped lang="scss">
.todo-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-bottom: 34px;

  .todo-list {
    overflow-y: auto;

    ul {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }
  }

  .todo-stats {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 34px;
    line-height: 34px;
    font-size: 12px;
    margin: 0;
    padding: 0 12px;
    list-style-type: none;
    cursor: default;
    user-select: none;

    li {
      float: left;
      margin-right: 10px;

      &:last-child {
        float: right;
        margin: 0 0 0 10px;

        a {
          cursor: pointer;
          padding: 10px 5px;
        }
      }
    }
  }
}
</style>
