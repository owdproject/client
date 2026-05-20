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
  root: { class: 'gnome-explorer-popup-menu' },
}

function toggle(event: Event) {
  menu.value?.toggle(event)
}
</script>

<template>
  <div class="gnome-explorer-overflow">
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      class="gnome-explorer-overflow__trigger"
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
.gnome-explorer-overflow {
  display: inline-flex;
  align-items: center;
}

.gnome-explorer-overflow__trigger {
  width: 34px;
  height: 28px;
  padding: 0;
  color: rgba(245, 245, 245, 0.96);
}

.gnome-explorer-overflow :deep(.p-button > .iconify) {
  display: inline-block;
  width: 1em;
  height: 1em;
  color: rgba(245, 245, 245, 0.96) !important;
  opacity: 1;
}
</style>
