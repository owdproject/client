import VueResizable from 'vue-resizable'

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.component('vue-resizable', VueResizable)
})