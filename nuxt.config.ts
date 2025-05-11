import {createResolver} from "@nuxt/kit";

const {resolve} = createResolver(import.meta.url)

export default defineNuxtConfig({
    ssr: false,

    alias: {
        '@owdproject/core': resolve(__dirname, './core')
    },

    modules: [
        './core',
    ],

    css: [
        './app/assets/styles/index.scss',
    ],

    i18n: {
        strategy: 'no_prefix',
    },

    future: {
        compatibilityVersion: 4,
    },

    devtools: {
        enabled: false,
    },

    compatibilityDate: '2025-05-09'
})