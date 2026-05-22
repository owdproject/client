<script setup lang="ts">
export type ExplorerViewMode = 'list' | 'details' | 'largeIcons'

defineProps<{
  modelValue: ExplorerViewMode
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [mode: ExplorerViewMode]
  select: [mode: ExplorerViewMode]
}>()

function choose(mode: ExplorerViewMode) {
  emit('update:modelValue', mode)
  emit('select', mode)
}
</script>

<template>
  <div
    class="explorer-view-mode-switch"
    data-part="viewmode-root"
    role="group"
    :aria-label="ariaLabel ?? 'View mode'"
  >
    <button
      type="button"
      class="explorer-view-mode-switch__btn"
      data-part="viewmode-list"
      :class="{ 'is-active': modelValue === 'list' }"
      aria-label="List view"
      @click="choose('list')"
    >
      <slot name="list-icon">
        <Icon name="mdi:format-list-bulleted" size="16" />
      </slot>
    </button>
    <button
      type="button"
      class="explorer-view-mode-switch__btn"
      data-part="viewmode-details"
      :class="{ 'is-active': modelValue === 'details' }"
      aria-label="Details view"
      @click="choose('details')"
    >
      <slot name="details-icon">
        <Icon name="mdi:view-list-outline" size="16" />
      </slot>
    </button>
    <button
      type="button"
      class="explorer-view-mode-switch__btn"
      data-part="viewmode-large-icons"
      :class="{ 'is-active': modelValue === 'largeIcons' }"
      aria-label="Large icons view"
      @click="choose('largeIcons')"
    >
      <slot name="large-icons-icon">
        <Icon name="mdi:view-grid-outline" size="16" />
      </slot>
    </button>
  </div>
</template>

<style scoped lang="scss">
.explorer-view-mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.explorer-view-mode-switch__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
}
</style>
