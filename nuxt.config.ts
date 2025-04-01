import {owdConfig} from "./owd.config";

export default defineNuxtConfig({
    ssr: false,

    extends: [

        // import owd core
        './core',

        // import owd modules
        ...owdConfig.extends.modules,

        // import owd theme
        owdConfig.extends.theme,

        // import owd apps
        ...owdConfig.extends.apps,

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