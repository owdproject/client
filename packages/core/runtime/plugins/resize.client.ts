import VueResizable from 'vue-resizable/src/components/vue-resizable.vue'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('vue-resizable', VueResizable)
})
