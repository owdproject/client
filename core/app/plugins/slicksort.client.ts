import { plugin as Slicksort } from 'vue-slicksort'

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.use(Slicksort)
})