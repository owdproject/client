import {owdConfig} from "./owd.config";

export default defineNuxtConfig({
    ssr: false,

    extends: [

        // import layers: owd core
        './core',

        // import layers: owd theme
        owdConfig.theme,

        // import layers: owd apps
        ...owdConfig.apps,

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
    }
})