import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  installModule,
} from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'owd-kit-explorer',
    configKey: 'kitExplorer',
  },
  async setup() {
    const { resolve } = createResolver(import.meta.url)

    /** Lower-layer explorer UI primitives (`KitFs*` components, composables). */
    await installModule('@owdproject/kit-fs')

    addComponentsDir({
      path: resolve('./runtime/components'),
      prefix: 'KitExplorer',
    })

    addImportsDir(resolve('./runtime/composables'))
  },
})
