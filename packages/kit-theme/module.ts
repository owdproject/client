import { defineNuxtModule, createResolver, addImportsDir } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-theme',
    configKey: 'kitTheme',
  },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addImportsDir(resolve('./runtime/composables'))
  },
})
