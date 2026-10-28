export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@owdproject/nuxt'
  ],

  i18n: {
    strategy: 'no_prefix',
  },

  compatibilityDate: '2026-05-31',

  experimental: {
    viteEnvironmentApi: true,
  },
})
