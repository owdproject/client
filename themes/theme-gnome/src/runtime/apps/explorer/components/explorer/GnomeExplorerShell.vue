<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import { useExplorerTabs } from '@owdproject/kit-explorer/runtime/composables/useExplorerTabs'
import type { MenuItem } from 'primevue/menuitem'
import { useFileSystemExplorer } from '@owdproject/module-fs/runtime/composables/useFileSystemExplorer'
import createExplorerFsOperations from '@owdproject/kit-fs/runtime/composables/useExplorerFsOperations'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'
import GnomeExplorerHeaderBar from './GnomeExplorerHeaderBar.vue'
import GnomeExplorerMainPane from './GnomeExplorerMainPane.vue'
import GnomeExplorerTabStrip from './GnomeExplorerTabStrip.vue'
import { useGnomeExplorerPlaces } from '../../composables/useGnomeExplorerPlaces'
import { useI18n } from 'vue-i18n'
import { provide, watch } from 'vue'

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

const places = useGnomeExplorerPlaces()
provide('gnomeExplorerPlaces', places)

const explorerTabs = useExplorerTabs(props.window, fsExplorer, {
  metaKey: 'explorerTabs',
  pathToLabel(path: string) {
    const p = (path || '/').trim() || '/'
    if (p === '/') return t('apps.explorer.places.home')
    const parts = p.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? p
  },
  closeLastTab: () => {
    props.window.destroy()
  },
})

provide('gnomeExplorerOpenPathInNewTab', (path: string) => {
  void explorerTabs.openPathInNewTab(path)
})

void fsExplorer.initialize().then(() => {
  explorerTabs.initTabs()
})

async function navigateExplorerTo(target: string) {
  const raw = (target || '/').trim() || '/'
  const normalized = /^https?:\/\//i.test(raw)
    ? raw
    : (() => {
        let p = raw
        if (!p.startsWith('/')) p = `/${p}`
        return p
      })()

  places.selectPlace('folder', normalized)
  fsExplorer.basePath.value = normalized
  fsExplorer.fsDirectoryNavigation.hydrate({
    paths: [normalized],
    index: 0,
  })
  await fsExplorer.navigateToDirectory(normalized)
}

watch(
  () => places.browsePathForPlace(),
  async (path) => {
    if (path == null) return
    if (places.activePlaceId.value === 'recent' || places.activePlaceId.value === 'starred' || places.activePlaceId.value === 'network') {
      return
    }
    fsExplorer.basePath.value = path
    fsExplorer.fsDirectoryNavigation.hydrate({ paths: [path], index: 0 })
    await fsExplorer.navigateToDirectory(path)
  },
)
</script>

<template>
  <Frame
    class="gnome-explorer-frame"
    :chrome-padding="false"
    :window="window"
    :config="config"
  >
    <template #header-below-nav>
      <div class="gnome-explorer-header-stack">
        <GnomeExplorerHeaderBar
          :window="window"
          :fs-explorer="fsExplorer"
          :overflow-menu="overflowMenu"
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
        <GnomeExplorerTabStrip
          :tabs="explorerTabs.tabsDisplay"
          :active-tab-id="explorerTabs.activeTabId"
          @select="explorerTabs.selectTab"
          @add="explorerTabs.addTab"
          @close="explorerTabs.closeTab"
        />
      </div>
    </template>
    <div class="gnome-explorer-shell flex flex-col h-full min-h-0 overflow-hidden">
      <GnomeExplorerMainPane :window="window" :fs-explorer="fsExplorer" />
    </div>
  </Frame>
</template>

<style scoped lang="scss">
.gnome-explorer-header-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.gnome-explorer-shell.h-full {
  overflow-x: hidden;
}

.gnome-explorer-shell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
