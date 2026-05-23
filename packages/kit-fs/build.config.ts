import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  failOnWarn: false,
  externals: [
    '@nuxt/kit',
    '@owdproject/core',
    '@owdproject/module-fs',
    '@zenfs/core',
    'vue',
    'nuxt',
    'vue3-selecto',
  ],
})
