import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  ssr: false,
  devServer: {
    host: '127.0.0.1',
  },

  modules: ['@owdproject/nuxt'],

  css: ['~/assets/styles/index.scss'],

  i18n: {
    strategy: 'no_prefix',
  },

  imports: {
    autoImport: true,
  },
  devtools: {
    enabled: false,
  },
  compatibilityDate: '2026-05-31',
  experimental: {
    viteEnvironmentApi: true,
  },
})
