import pkg from './package.json'
import {createResolver} from "@nuxt/kit";
import { join } from 'path';

const {resolve} = createResolver(import.meta.url);

export default defineNuxtConfig({
    alias: {
        "~": resolve(__dirname, "."),
    },

    css: [
        '~/app/assets/styles/core.scss'
    ],

    modules: [
        '@primevue/nuxt-module',
        '@pinia/nuxt',
        'pinia-plugin-persistedstate/nuxt',
        '@nuxt/fonts',
        '@vueuse/nuxt',
        '@nuxtjs/i18n',
        '@nuxt/icon',
    ],

    icon: {
        clientBundle: {
            scan: true,
            sizeLimitKb: 256,
        },
    },

    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler'
                }
            }
        },
    },

    imports: {
        dirs: ['api', 'composables', 'core/controllers', 'core/managers', 'models', 'stores', 'utils'],
        presets: [
            {
                from: 'nanoid',
                imports: ['nanoid']
            },
            {
                from: 'deepmerge',
                imports: ['']
            },
            {
                from: join(__dirname, 'app/utils/utilsDesktop'),
                imports: [ 'defineDesktopApp' ]
            }
        ]
    },

    runtimeConfig: {
        public: {
            coreVersion: pkg.version,
        }
    },

    future: {
        compatibilityVersion: 4,
    },

    compatibilityDate: '2024-11-28',
});