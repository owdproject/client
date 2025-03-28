import {createResolver} from "@nuxt/kit";

const {resolve} = createResolver(import.meta.url);

export default defineNuxtConfig({
    alias: {
        "~": resolve(__dirname, "."),
    },

    imports: {
        dirs: ['composables', 'core/controllers', 'core/managers', 'stores', 'utils'],
        presets: [
            {
                from: 'nanoid',
                imports: ['nanoid']
            },
            {
                from: 'deepmerge',
                imports: ['merge']
            },
        ]
    },

    future: {
        compatibilityVersion: 4,
    },

    compatibilityDate: '2024-11-28',
});