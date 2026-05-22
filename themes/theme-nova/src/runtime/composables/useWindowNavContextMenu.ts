import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ContextMenu from 'primevue/contextmenu'
import type { IWindowController } from '@owdproject/core'
import type { MenuItem } from 'primevue/menuitem'

export function useWindowNavContextMenu(
  windowController: IWindowController | undefined,
) {
  const { t } = useI18n()
  const menu = ref<InstanceType<typeof ContextMenu> | null>(null)

  const items = computed<MenuItem[]>(() => {
    const wc = windowController
    if (!wc?.instanced) return []

    const result: MenuItem[] = []

    if (wc.isMinimizable) {
      result.push({
        label: t('window.contextMenu.minimize'),
        icon: 'pi pi-minus',
        command: () => wc.actions.minimize(),
      })
    }

    if (wc.isMaximizable) {
      result.push({
        label: wc.isMaximized
          ? t('window.contextMenu.restore')
          : t('window.contextMenu.maximize'),
        icon: wc.isMaximized ? 'pi pi-window-minimize' : 'pi pi-window-maximize',
        command: () => wc.actions.toggleMaximize(),
      })
    }

    if (wc.isDestroyable) {
      if (result.length > 0) {
        result.push({ separator: true })
      }
      result.push({
        label: t('window.contextMenu.close'),
        icon: 'pi pi-times',
        command: () => wc.actions.destroy(),
      })
    }

    return result
  })

  function onNavContextMenu(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    if (target?.closest('.owd-window-nav__btn-group')) {
      return
    }

    event.preventDefault()

    const wc = windowController
    if (!wc?.instanced || items.value.length === 0) {
      return
    }

    menu.value?.show(event)
  }

  return { menu, items, onNavContextMenu }
}
