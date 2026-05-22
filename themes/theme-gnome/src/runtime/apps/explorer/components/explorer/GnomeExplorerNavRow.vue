<script setup lang="ts">
import Button from 'primevue/button'

defineProps<{
  arrowsDisabled: boolean
}>()

defineEmits<{
  back: []
  forward: []
}>()
</script>

<template>
  <div class="gnome-explorer-nav-row">
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      :disabled="arrowsDisabled"
      aria-label="Back"
      @click="$emit('back')"
    >
      <Icon name="mdi:arrow-left" size="20" />
    </Button>
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      :disabled="arrowsDisabled"
      aria-label="Forward"
      @click="$emit('forward')"
    >
      <Icon name="mdi:arrow-right" size="20" />
    </Button>
  </div>
</template>

<style scoped lang="scss">
.gnome-explorer-nav-row {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px 4px 2px 6px;
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
  background: transparent;
}

.gnome-explorer-nav-row :deep(.p-button) {
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92));
}

.gnome-explorer-nav-row :deep(.p-button > .iconify) {
  display: inline-block;
  width: 1em;
  height: 1em;
  color: var(--gnome-explorer-fg, rgba(255, 255, 255, 0.92)) !important;
  opacity: 1;
}
</style>
