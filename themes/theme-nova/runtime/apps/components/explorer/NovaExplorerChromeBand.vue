<script setup lang="ts">
import ExplorerChromeBandBase from '@owdproject/kit-explorer/runtime/components/explorer/ExplorerChromeBandBase.vue'
import NovaExplorerBreadcrumbBar from './NovaExplorerBreadcrumbBar.vue'
import NovaExplorerNavRow from './NovaExplorerNavRow.vue'

defineProps<{
  arrowsDisabled: boolean
  path: string
}>()

const emit = defineEmits<{
  back: []
  forward: []
  up: []
  refresh: []
  navigate: [path: string]
  commit: [path: string]
}>()
</script>

<template>
  <ExplorerChromeBandBase class="win11-explorer-chrome-band__inner">
    <template #nav>
      <div class="win11-explorer-chrome-band__nav">
        <NovaExplorerNavRow
          :arrows-disabled="arrowsDisabled"
          @back="emit('back')"
          @forward="emit('forward')"
          @up="emit('up')"
          @refresh="emit('refresh')"
        />
      </div>
    </template>

    <template #breadcrumb>
      <div class="win11-explorer-chrome-band__crumb">
        <NovaExplorerBreadcrumbBar
          :path="path"
          @navigate="emit('navigate', $event)"
          @commit="emit('commit', $event)"
        />
      </div>
    </template>
  </ExplorerChromeBandBase>
</template>

<style scoped lang="scss">
.win11-explorer-chrome-band__inner {
  :deep([data-part='chrome-band-root']) {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
}

.win11-explorer-chrome-band__nav {
  flex: 0 0 auto;
}

.win11-explorer-chrome-band__crumb {
  flex: 1;
  min-width: 0;
}
</style>
