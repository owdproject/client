<script setup lang="ts">
import { nanoid } from 'nanoid'
import { useTodoStore } from '../../stores/storeTodo'
import { computed } from '@vue/reactivity'

const todoStore = useTodoStore()

const todoCount = computed(() => todoStore.list.length)
const todoCountCompleted = computed(
  () => todoStore.list.filter((item) => item.completed).length,
)
const todoCountNotCompleted = computed(
  () => todoStore.list.filter((item) => !item.completed).length,
)

const todoListFiltered = computed(() => {
  return todoStore.list
    .sort((a, b) => +b.completed - +a.completed)
    .filter(function (item) {
      switch (todoStore.filter) {
        case 'todo':
          return item.completed === false
        case 'done':
          return item.completed === true
        default:
          return true
      }
    })
})

function todoAdd(item) {
  if (item && item.trim() !== '') {
    todoStore.list.push({
      id: nanoid(8),
      title: item,
      completed: false,
      editing: false,
    })

    // set show All if Done filter is active
    if (todoStore.filter === 'done') {
      todoStore.filter = 'all'
    }
  }
}

/**
 * Remove to-do
 */
function onTodoRemove(index: number) {
  if (confirm('Are you sure to remove this item?') !== true) {
    return
  }

  todoStore.list.splice(index, 1)
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
          <template v-for="(todo, index) in todoListFiltered" :key="todo.id">
            <TodoListItem :todo="todo" @remove="onTodoRemove(index)" />
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
            :class="[{ 'opacity-50': todoStore.filter !== 'all' }]"
            @click="todoStore.filter = 'all'"
            >all</a
          >
          <a
            :class="[{ 'opacity-50': todoStore.filter !== 'todo' }]"
            @click="todoStore.filter = 'todo'"
            >to do</a
          >
          <a
            :class="[{ 'opacity-50': todoStore.filter !== 'done' }]"
            @click="todoStore.filter = 'done'"
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
