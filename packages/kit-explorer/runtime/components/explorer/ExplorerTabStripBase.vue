<script setup lang="ts">
withDefaults(defineProps<{
  tabs: { id: string; label: string }[]
  activeTabId: string
  ariaLabel?: string
  newTabAriaLabel?: string
  closeTabAriaLabel?: string
}>(), {
  ariaLabel: 'Explorer tabs',
  newTabAriaLabel: 'New tab',
  closeTabAriaLabel: 'Close tab',
})

const emit = defineEmits<{
  select: [id: string]
  add: []
  close: [id: string]
}>()

function onTabMouseUp(id: string, e: MouseEvent) {
  if (e.button === 1) {
    e.preventDefault()
    emit('close', id)
  }
}
</script>

<template>
  <div
    class="explorer-tab-strip-base"
    data-part="tabstrip-root"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="explorer-tab-strip-base__tab"
      data-part="tab"
      role="tab"
      :aria-selected="tab.id === activeTabId"
      @click="emit('select', tab.id)"
      @mouseup="onTabMouseUp(tab.id, $event)"
    >
      <span class="explorer-tab-strip-base__tab-label truncate">
        {{ tab.label }}
      </span>
      <span
        v-if="tabs.length > 1"
        class="explorer-tab-strip-base__close"
        data-part="tab-close"
        :aria-label="closeTabAriaLabel"
        @click.stop="emit('close', tab.id)"
      >
        ×
      </span>
    </button>

    <button
      type="button"
      class="explorer-tab-strip-base__new"
      data-part="tab-new"
      :aria-label="newTabAriaLabel"
      @click="emit('add')"
    >
      +
    </button>
  </div>
</template>

<style scoped lang="scss">
.explorer-tab-strip-base {
  display: flex;
  align-items: stretch;
  min-width: 0;
}

.explorer-tab-strip-base__tab {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.explorer-tab-strip-base__tab-label {
  min-width: 0;
}

.explorer-tab-strip-base__new {
  flex-shrink: 0;
}
</style>
