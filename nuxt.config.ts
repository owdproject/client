import {owdConfig} from "./owd.config";

export default defineNuxtConfig({
    ssr: false,

    extends: [
        './core',
        owdConfig.theme,
    ],

    css: [
        './app/assets/styles/index.scss',
    ],

    future: {
        compatibilityVersion: 4,
    },
})