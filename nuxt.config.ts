import {join} from "path";

export default defineNuxtConfig({
    ssr: false,

    extends: [

        // import owd core
        './core',

        // import owd theme
        'github:owdproject/owd-theme-win95',

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
})