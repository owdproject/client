import pkg from './package.json'
import {createResolver} from "@nuxt/kit";

const {resolve} = createResolver(import.meta.url);

export default defineNuxtConfig({
    ssr: false,

    css: [
        '~/app/assets/styles/core.scss'
    ],

    alias: {
        "~": resolve(__dirname, "."),
    },

    modules: [
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