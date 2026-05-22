import { useApplicationManager } from '@owdproject/core/runtime/composables/useApplicationManager'
import { useDesktopManager } from '@owdproject/core/runtime/composables/useDesktopManager'
import { useAppConfig } from 'nuxt/app'
import { ref, computed } from 'vue'

export function useSystemBar(_config?: DesktopSystemBarConfig | undefined) {
    const applicationManager = useApplicationManager()
    const desktopManager = useDesktopManager()
    const appConfig = useAppConfig()

    const config = computed(
        () =>
            ({ ...appConfig.desktop?.systemBar, ..._config }) as DesktopSystemBarConfig,
    )

    const defaultTerminalApp = desktopManager.getDefaultApp('terminal')
    const defaultAuthApp = desktopManager.getDefaultApp('auth')

    const enabled = ref(false)
    const windows = computed(() => applicationManager.windowsOpened)

    const menu = computed(() => {
        const systemBarMenu: any = []

        return systemBarMenu
    })

    return {
        config,
        windows,
        menu,
    }
}
