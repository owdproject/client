import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  failOnWarn: false,
  externals: [
    '@nuxt/kit',
    '@owdproject/core',
    '@owdproject/kit-fs',
    'vue',
    'nuxt',
  ],
})
