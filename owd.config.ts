export const owdConfig = {
    /**
     *
     *  OWD EXTEND
     *
     *  everything defined here will extend
     *  your owd project using nuxt layers
     *
     */
    extends: {
        theme: './desktop/themes/owd-theme-win95',

        modules: [],

        // your owd apps, you should define apps as layers
        // but simple apps with iframes will work anyway
        apps: [
            './desktop/apps/owd-app-about',
            './desktop/apps/owd-app-debug',
        ],
    },
    /**
     *
     *  OWD LOADER
     *
     *  import each owd app configuration,
     *  it will initialize the app itself
     *
     */
    loader: () => {
        import('./desktop/apps/owd-app-about/owd.config')
        import('./desktop/apps/owd-app-debug/owd.config')
    }
}