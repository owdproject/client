import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  workspaceDir: '../../',
  srcDir: 'app',
  modules: [
    "@owdproject/core"
  ],
  typescript: {
    typeCheck: true,
    tsConfig: {
      extends: '../tsconfig.app.json',
    },
  },
  imports: {
    autoImport: true,
  },
  future: {
    compatibilityVersion: 4
  },
  vite: {
    plugins: [nxViteTsPaths()],
  },
});
