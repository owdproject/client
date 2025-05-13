export default defineNuxtConfig({
    ssr: false,

    srcDir: 'desktop',

    modules: [
        '@owdproject/core',
    ],

    css: [
        './desktop/assets/styles/index.scss',
    ],

    i18n: {
        strategy: 'no_prefix',
    },

    future: {
        compatibilityVersion: 4,
    },

    devtools: {
        enabled: false,
    }
})
