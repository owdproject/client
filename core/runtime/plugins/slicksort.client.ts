import { plugin as Slicksort } from 'vue-slicksort'
import {defineNuxtPlugin} from "nuxt/app"

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.use(Slicksort)
})