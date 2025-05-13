export default defineNuxtConfig({
    ssr: false,

    srcDir: 'desktop',

    modules: [
        '@owdproject/core',
    ],

    css: [
        './app/assets/styles/index.scss',
    ],

    i18n: {
        strategy: 'no_prefix',
    },

    imports: {
        presets: [
            {
                from: '@owdproject/core',
                imports: [
                    'defineDesktopApp',
                    'defineDesktopConfig',
                ]
            }
        ]
    },

    future: {
        compatibilityVersion: 4,
    },

    devtools: {
        enabled: false,
    }
})
