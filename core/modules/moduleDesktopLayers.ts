import {defineNuxtModule, useNuxt} from '@nuxt/kit';
import path from 'path';

export default defineNuxtModule({
    meta: {
        name: 'extend-owd-layers'
    },
    setup(_options, nuxt) {
        const allLayers = nuxt.options._layers;

        const desktopAppsLayers = allLayers
            .filter(
                layer => layer.config.rootDir.includes('/desktop/apps/')
            )
            .map(
                layer => 'local:' + path.basename(layer.config.rootDir)
            )

        nuxt.options.appConfig.owd = {
            apps: desktopAppsLayers
        }
    }
});