import {owdConfig} from "./owd.config";

export default defineNuxtConfig({
    ssr: false,

    modules: [
        './core/module',
    ],

    extends: [

        // import layers: owd theme
        // @ts-ignore
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