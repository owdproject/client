<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import { useExplorerTabs } from '@owdproject/kit-explorer/runtime/composables/useExplorerTabs'
import type { MenuItem } from 'primevue/menuitem'
import { useFileSystemExplorer } from '@owdproject/module-fs/runtime/composables/useFileSystemExplorer'
import createExplorerFsOperations from '@owdproject/kit-fs/runtime/composables/useExplorerFsOperations'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'
import NovaExplorerCommandBar from './NovaExplorerCommandBar.vue'
import NovaExplorerChromeBand from './NovaExplorerChromeBand.vue'
import NovaExplorerMainPane from './NovaExplorerMainPane.vue'
import NovaExplorerStatusBar from './NovaExplorerStatusBar.vue'
import NovaExplorerTabStrip from './NovaExplorerTabStrip.vue'
import { useI18n } from 'vue-i18n'
import { provide } from 'vue'

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

provide('novaExplorerOpenPathInNewTab', (path: string) => {
  void explorerTabs.openPathInNewTab(path)
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
      <NovaExplorerTabStrip
        :tabs="explorerTabs.tabsDisplay"
        :active-tab-id="explorerTabs.activeTabId"
        @select="explorerTabs.selectTab"
        @add="explorerTabs.addTab"
        @close="explorerTabs.closeTab"
      />
    </template>
    <template #header-below-nav>
      <div class="win11-explorer-top-band">
        <NovaExplorerChromeBand
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
    <div class="win11-explorer-shell flex flex-col h-full min-h-0 overflow-hidden">
      <NovaExplorerCommandBar
        :window="window"
        :fs-explorer="fsExplorer"
        :overflow-menu="overflowMenu"
      />
      <div class="win11-explorer-shell__content">
        <NovaExplorerMainPane :window="window" :fs-explorer="fsExplorer" />
      </div>
      <NovaExplorerStatusBar
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

/*
 * Must be a flex column so `.win11-explorer-main-pane` gets a bounded height (`flex: 1` +
 * `min-height: 0`). Otherwise the main pane grows with the tallest child (often the nav tree),
 * no overflow is created, and the nav’s inner `.win11-explorer-nav-pane__scroll` never scrolls.
 */
.win11-explorer-shell__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.win11-explorer-shell__content > .win11-explorer-main-pane {
  flex: 1;
  min-height: 0;
}

:deep(.owd-window:not(.owd-window--focused)) iframe {
  pointer-events: none;
}
</style>
