import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  failOnWarn: false,
  externals: ['@nuxt/kit', '@owdproject/core', '@vueuse/core', 'vue', 'nuxt'],
})
