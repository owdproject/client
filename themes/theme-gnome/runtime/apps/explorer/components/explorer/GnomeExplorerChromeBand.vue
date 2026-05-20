<script setup lang="ts">
import ExplorerChromeBandBase from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerChromeBandBase.vue'
import GnomeExplorerBreadcrumbBar from './GnomeExplorerBreadcrumbBar.vue'
import GnomeExplorerNavRow from './GnomeExplorerNavRow.vue'

defineProps<{
  arrowsDisabled: boolean
  path: string
}>()

const emit = defineEmits<{
  back: []
  forward: []
  navigate: [path: string]
  commit: [path: string]
}>()
</script>

<template>
  <ExplorerChromeBandBase class="gnome-explorer-chrome-band__inner">
    <template #nav>
      <div class="gnome-explorer-chrome-band__nav">
        <GnomeExplorerNavRow
          :arrows-disabled="arrowsDisabled"
          @back="emit('back')"
          @forward="emit('forward')"
        />
      </div>
    </template>

    <template #breadcrumb>
      <div class="gnome-explorer-chrome-band__crumb">
        <GnomeExplorerBreadcrumbBar
          :path="path"
          @navigate="emit('navigate', $event)"
          @commit="emit('commit', $event)"
        />
      </div>
    </template>
  </ExplorerChromeBandBase>
</template>

<style scoped lang="scss">
.gnome-explorer-chrome-band__inner {
  :deep([data-part='chrome-band-root']) {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
}

.gnome-explorer-chrome-band__nav {
  flex: 0 0 auto;
}

.gnome-explorer-chrome-band__crumb {
  flex: 1;
  min-width: 0;
}
</style>
