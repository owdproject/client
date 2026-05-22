<script setup lang="ts">
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'

defineProps<{
  model: MenuItem[]
}>()

const menu = ref<InstanceType<typeof TieredMenu> | null>(null)

const explorerOverlayPt = {
  root: { class: 'nova-explorer-popup-menu' },
}

function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>

<template>
  <div class="nova-explorer-overflow">
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      class="nova-explorer-overflow__trigger"
      aria-haspopup="true"
      aria-expanded="false"
      @click="toggle"
    >
      <Icon name="mdi:dots-horizontal" size="20" />
    </Button>
    <TieredMenu ref="menu" :model="model" popup :pt="explorerOverlayPt" />
  </div>
</template>

<style scoped lang="scss">
.nova-explorer-overflow {
  display: inline-flex;
  align-items: center;
}

.nova-explorer-overflow__trigger {
  width: var(--nova-window-control-size, 28px);
  height: var(--nova-window-control-size, 28px);
  padding: 0;
  color: var(--nova-explorer-text);
  border-radius: var(--nova-window-control-radius, 8px);
}

.nova-explorer-overflow :deep(.p-button:hover) {
  background: var(--nova-window-control-hover);
}

.nova-explorer-overflow :deep(.p-button > .iconify) {
  display: inline-block;
  width: 1em;
  height: 1em;
  color: var(--nova-explorer-text) !important;
  opacity: 0.88;
}
</style>
