import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  ssr: false,
  devServer: {
    host: "127.0.0.1",
  },

  modules: [
    '@owdproject/core',
  ],

  css: [
    './desktop/app/assets/styles/index.scss',
  ],

  i18n: {
    strategy: 'no_prefix',
  },

  future: {
    compatibilityVersion: 4,
  },

  imports: {
    autoImport: true,
  },
  devtools: {
    enabled: false,
  },
  typescript: {
    typeCheck: true,
    tsConfig: {
      extends: '../tsconfig.app.json',
    },
  },
  future: {
    compatibilityVersion: 4
  },
  compatibilityDate: '2025-05-13',
  vite: {
    plugins: [nxViteTsPaths()],
  },
});
