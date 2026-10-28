export default defineNuxtConfig({
  ssr: false,

  modules: [
    'nuxt-desktop'
  ],

  i18n: {
    strategy: 'no_prefix',
  },

  compatibilityDate: '2026-05-31',

  experimental: {
    viteEnvironmentApi: true,
  },
})
