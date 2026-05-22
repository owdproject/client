import { defineNuxtModule, createResolver, addPlugin } from '@nuxt/kit'
import { registerTailwindPath } from '@owdproject/core'

export default defineNuxtModule({
  meta: { name: 'owd-app-fixture-valid' },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    addPlugin(resolve('./runtime/plugin'))
    registerTailwindPath(nuxt, resolve('./runtime/components/**/*.{vue,mjs,ts}'))
  },
})
