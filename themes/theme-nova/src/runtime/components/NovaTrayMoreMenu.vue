<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const open = ref(false)
const anchorRef = useTemplateRef('anchorRef')

onClickOutside(anchorRef, () => {
  open.value = false
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

defineExpose({ close })
</script>

<template>
  <div ref="anchorRef" class="nova-tray-more">
    <button
      type="button"
      class="nova-tray-btn"
      :class="{ 'nova-tray-btn--active': open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="$t('systemBar.tray.more')"
      @click.stop="toggle()"
    >
      <Icon name="mdi:dots-horizontal" :size="18" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="nova-tray-more__panel"
      role="menu"
      @click="close()"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.nova-tray-more {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.nova-tray-more__panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10052;
  min-width: 200px;
  padding: 6px;
  border-radius: 12px;
  background: var(--nova-start-surface, rgba(12, 18, 28, 0.98));
  border: 1px solid var(--nova-start-border, var(--owd-surface-700));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  color: #f1f5f9;

  :deep(.nova-tray-btn) {
    width: 100%;
    min-width: 0;
    height: 36px;
    padding: 0 10px;
    justify-content: flex-start;
    gap: 10px;
    border-radius: 8px;
  }

  :deep(.nova-top-bar__status-percent) {
    display: inline;
    margin-left: auto;
    font-size: 12px;
  }
}
</style>
