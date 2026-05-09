<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import { useExplorerTabs } from '@owdproject/kit-explorer/runtime/composables/useExplorerTabs'
import type { MenuItem } from 'primevue/menuitem'
import { useFileSystemExplorer } from '@owdproject/module-fs/runtime/composables/useFileSystemExplorer'
import createExplorerFsOperations from '@owdproject/kit-fs/runtime/composables/useExplorerFsOperations'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'
import Win11ExplorerCommandBar from './Win11ExplorerCommandBar.vue'
import Win11ExplorerChromeBand from './Win11ExplorerChromeBand.vue'
import Win11ExplorerMainPane from './Win11ExplorerMainPane.vue'
import Win11ExplorerStatusBar from './Win11ExplorerStatusBar.vue'
import Win11ExplorerTabStrip from './Win11ExplorerTabStrip.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  config?: WindowConfig
  window: IWindowController
  overflowMenu: MenuItem[]
}>()

const { t } = useI18n()

const fsExplorer = useFileSystemExplorer(
  props.window,
  createExplorerFsOperations,
  t,
)

props.window.fsExplorer = fsExplorer

const explorerTabs = useExplorerTabs(props.window, fsExplorer, {
  metaKey: 'explorerTabs',
  pathToLabel(path: string) {
    const p = (path || '/').trim() || '/'
    if (p === '/') return t('apps.explorer.tabs.thisPc')
    const parts = p.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? p
  },
  closeLastTab: () => {
    props.window.destroy()
  },
})

void fsExplorer.initialize().then(() => {
  explorerTabs.initTabs()
})

async function navigateExplorerTo(target: string) {
  let normalized = (target || '/').trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  fsExplorer.basePath.value = normalized
  fsExplorer.fsDirectoryNavigation.hydrate({
    paths: [normalized],
    index: 0,
  })
  await fsExplorer.navigateToDirectory(normalized)
}
</script>

<template>
  <Frame
    class="win11-explorer-frame"
    :chrome-padding="false"
    :window="window"
    :config="config"
  >
    <template #nav-title>
      <Win11ExplorerTabStrip
        :tabs="explorerTabs.tabsDisplay"
        :active-tab-id="explorerTabs.activeTabId"
        @select="explorerTabs.selectTab"
        @add="explorerTabs.addTab"
        @close="explorerTabs.closeTab"
      />
    </template>
    <template #header-below-nav>
      <div class="win11-explorer-top-band">
        <Win11ExplorerChromeBand
          :arrows-disabled="
            fsExplorer.fsDirectoryNavigation.history.value.length <= 1
          "
          :path="fsExplorer.basePath.value"
          @back="fsExplorer.directoryBack"
          @forward="fsExplorer.directoryForward"
          @up="fsExplorer.directoryUp"
          @refresh="fsExplorer.refreshDirectory()"
          @navigate="navigateExplorerTo($event)"
          @commit="navigateExplorerTo($event)"
        />
      </div>
    </template>
    <div class="win11-explorer-shell flex flex-col h-full min-h-0">
      <Win11ExplorerCommandBar
        :window="window"
        :fs-explorer="fsExplorer"
        :overflow-menu="overflowMenu"
      />
      <div class="win11-explorer-shell__content">
        <Win11ExplorerMainPane :window="window" :fs-explorer="fsExplorer" />
      </div>
      <Win11ExplorerStatusBar
        class="win11-explorer-shell__status"
        :count="fsExplorer.fsEntries.value.length"
        :fs-explorer="fsExplorer"
      />
    </div>
  </Frame>
</template>

<style scoped lang="scss">
.win11-explorer-shell.h-full {
  overflow-x: hidden;
}

.win11-explorer-top-band {
  background: var(--win11-explorer-chrome-light);
}

.win11-explorer-shell__content {
  flex: 1;
  min-height: 0;
}

:deep(.owd-window:not(.owd-window--focused)) iframe {
  pointer-events: none;
}
</style>
