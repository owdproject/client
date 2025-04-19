import {createResolver} from "@nuxt/kit";
import {owdConfig} from "./owd.config";

const {resolve} = createResolver(import.meta.url)

export default defineNuxtConfig({
    ssr: false,

    alias: {
        '@owdproject/core': resolve(__dirname, './core')
    },

    modules: [
        './core',
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