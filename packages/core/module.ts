import {
  defineNuxtModule,
  createResolver,
  addComponentsDir,
  addImportsDir,
  installModule,
  addPlugin
} from '@nuxt/kit'
import { defu } from 'defu'
import {
  assertValidDesktopUserConfig,
  installDesktopPackage,
  resolveDesktopConfigPath,
  warnDesktopConfigKeys,
  warnLegacyDesktopConfig,
} from './kit/authoring'
import pkg from './package.json'

export default defineNuxtModule({
  meta: {
    name: 'desktop',
    configKey: 'desktop',
  },
  defaults: {
    theme: '@owdproject/theme-nova',
    apps: [],
    modules: [],
  },
  moduleDependencies: {
    '@pinia/nuxt': {},
    '@nuxt/fonts': {},
    '@nuxt/icon': {
      defaults: {
        clientBundle: {
          scan: true,
          sizeLimitKb: 256,
        },
      },
    },
    '@vueuse/nuxt': {},
    '@nuxtjs/i18n': {},
  },
  async setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Required for Nuxt 4 dev (playgrounds, module graphs): avoids
    // "Vite Node IPC socket path not configured" when using @nuxt/kit pipelines.
    _nuxt.options.experimental = {
      ..._nuxt.options.experimental,
      viteEnvironmentApi:
        _nuxt.options.experimental?.viteEnvironmentApi ?? true,
    }

    _nuxt.options.runtimeConfig.public.desktop = {}

    // get open web desktop config (desktop.config.ts; owd.config.ts legacy)

    let clientConfig

    const resolvedConfig = resolveDesktopConfigPath(_nuxt.options.rootDir)

    if (!resolvedConfig) {
      const hint =
        'Create desktop.config.ts next to your Nuxt root (e.g. desktop/desktop.config.ts), export default defineDesktopConfig({ theme, apps, modules }).'
      throw new Error(`[@owdproject/core] Cannot find desktop.config.ts in ${_nuxt.options.rootDir}. ${hint}`)
    }

    warnLegacyDesktopConfig(resolvedConfig)

    // Nuxt dev restart + ℹ log (same as nuxt.config.ts); avoid builder:watch + restart (silent / double).
    _nuxt.options.watch ??= []
    _nuxt.options.watch.push(resolvedConfig.path)

    try {
      clientConfig = (await import(resolvedConfig.path)).default
    } catch (e) {
      const hint =
        'Export default defineDesktopConfig({ theme, apps, modules }) from desktop.config.ts.'
      throw new Error(
        `[@owdproject/core] Cannot load ${resolvedConfig.file}. ${hint}`,
        { cause: e },
      )
    }

    assertValidDesktopUserConfig(clientConfig, resolvedConfig.file)

    if (!clientConfig.theme) {
      clientConfig.theme = '@owdproject/theme-nova'
    }

    const configRecord = clientConfig as Record<string, unknown>
    warnDesktopConfigKeys(configRecord, resolvedConfig.file)

    const desktop = defu(configRecord, { coreVersion: pkg.version }) as Record<
      string,
      unknown
    > & {
      theme?: string
      apps?: string[]
      modules?: string[]
    }

    _nuxt.options.runtimeConfig.public.desktop = desktop

    {
      if (desktop.theme) {
        await installDesktopPackage(_nuxt, desktop.theme, desktop)
      }

      if (Array.isArray(desktop.modules)) {
        for (const modulePath of desktop.modules) {
          await installDesktopPackage(_nuxt, modulePath, desktop)
        }
      }

      if (Array.isArray(desktop.apps)) {
        for (const appPath of desktop.apps) {
          await installDesktopPackage(_nuxt, appPath, desktop)
        }
      }
    }

    // assign runtimeConfig desktop prop to appConfig
    // to make it overwritable by components later
    // via useDesktopManager
    _nuxt.options.appConfig.desktop = _nuxt.options.runtimeConfig.public.desktop

    {
      // configure scss for vite

      _nuxt.hook('vite:extendConfig', (viteConfig) => {
        viteConfig.css = viteConfig.css || {}
        viteConfig.css.preprocessorOptions =
          viteConfig.css.preprocessorOptions || {}
        viteConfig.css.preprocessorOptions.scss = {
          api: 'modern-compiler'
        }
      })
    }

    {
      // add css

      _nuxt.options.css.push('sanitize.css')
    }

    {
      // add components

      addComponentsDir({
        path: resolve('./runtime/components'),
        prefix: 'Desktop',
        pathPrefix: false,
        global: true
      })
    }

    {
      addPlugin(resolve('./runtime/plugins/resize.client.ts'))
      addPlugin(
        resolve('./runtime/plugins/01.desktop-shell-init.client.ts'),
      )
      addPlugin(
        resolve('./runtime/plugins/02.desktop-register-desktop-apps.client.ts'),
      )

      // add other files

      addImportsDir(resolve('./runtime/composables'))
      addImportsDir(resolve('./runtime/stores'))
      addImportsDir(resolve('./runtime/utils'))
    }
  }
})
