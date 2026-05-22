import type { IWindowController } from '@owdproject/core'
import { useExplorerTabs } from '@owdproject/kit-explorer/runtime/composables/useExplorerTabs'

type FsExplorerLike = Parameters<typeof useExplorerTabs>[1]

export function useWin11ExplorerTabs(
  window: IWindowController,
  fsExplorer: FsExplorerLike,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  function pathToLabel(path: string): string {
    const p = (path || '/').trim() || '/'
    if (p === '/') return t('apps.explorer.tabs.thisPc')
    const parts = p.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? p
  }
  return useExplorerTabs(window, fsExplorer, {
    metaKey: 'explorerTabs',
    pathToLabel,
    closeLastTab: () => {
      window.destroy()
    },
  })
}
