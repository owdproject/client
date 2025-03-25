export default defineNuxtConfig({
    ssr: false,

    extends: [
        './core',
        './themes/owd-theme-win95',
    ],

    css: [
        './app/assets/styles/index.scss',
    ],

    future: {
        compatibilityVersion: 4,
    },

    compatibilityDate: '2025-03-11'
})