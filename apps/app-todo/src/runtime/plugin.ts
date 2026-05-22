import { defineNuxtPlugin } from 'nuxt/app'
import { defineDesktopApp } from '@owdproject/core/runtime/utils/utilDesktop'
import configAppTodo from './app.config'
import './stores/storeTodo'

export default defineNuxtPlugin({
  name: 'owd-app-todo-register',
  async setup() {
    if (import.meta.server) return
    await defineDesktopApp(configAppTodo)
  },
})
