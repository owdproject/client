<script setup lang="ts">
import Button from 'primevue/button'

defineProps<{
  arrowsDisabled: boolean
}>()

defineEmits<{
  back: []
  forward: []
  up: []
  refresh: []
}>()
</script>

<template>
  <div class="win11-explorer-nav-row">
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
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      aria-label="Up"
      @click="$emit('up')"
    >
      <Icon name="mdi:arrow-up" size="20" />
    </Button>
    <Button
      type="button"
      rounded
      variant="text"
      severity="secondary"
      aria-label="Refresh"
      @click="$emit('refresh')"
    >
      <Icon name="mdi:refresh" size="20" />
    </Button>
  </div>
</template>

<style scoped lang="scss">
.win11-explorer-nav-row {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px 4px 2px 6px;
  color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
  background: transparent;
}

.win11-explorer-nav-row :deep(.p-button) {
  color: var(--win11-shell-text, rgba(245, 245, 245, 0.96));
}

.win11-explorer-nav-row :deep(.p-button > .iconify) {
  display: inline-block;
  width: 1em;
  height: 1em;
  color: var(--win11-shell-text, rgba(245, 245, 245, 0.96)) !important;
  opacity: 1;
}
</style>
