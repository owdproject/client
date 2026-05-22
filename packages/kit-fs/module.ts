import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-fs',
    configKey: 'kitFs',
  },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: 'KitFs',
    })

    addImportsDir(resolve('./runtime/composables'))
  },
})
