import { defineNuxtModule, createResolver, addPlugin } from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/kit-primevue/kit/registerTailwindPath'

export default defineNuxtModule({
  meta: { name: 'desktop-app-fixture-valid' },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    addPlugin(resolve('./runtime/plugin'))
    registerTailwindPath(
      nuxt,
      resolve('./runtime/components/**/*.{vue,mjs,ts}'),
    )
  },
})
