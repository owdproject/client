<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import { computed } from 'vue'
import Window from './Window.vue'

const props = defineProps<{
  config?: WindowConfig
  window?: IWindowController
  src?: string
  width?: string
  height?: string
  allow?: string
}>()

const iframeSrc = computed(() => {
  const fromProps = props.src?.trim()
  if (fromProps) return fromProps
  const meta = props.window?.meta as { path?: string; src?: string } | undefined
  return (meta?.src ?? meta?.path ?? '').trim()
})

const isWebUrl = computed(() => /^https?:\/\//i.test(iframeSrc.value))
</script>

<template>
  <Window
    :config="config"
    :window="window"
    :chrome-padding="false"
  >
    <iframe
      v-if="isWebUrl"
      :class="{ 'pointer-events-none': window && !window.state.focused }"
      :src="iframeSrc"
      :width="width"
      :height="height"
      :allow="allow"
    />
    <div v-else class="win11-window-iframe__empty">
      No URL to display
    </div>
  </Window>
</template>

<style scoped lang="scss">
:deep(.p-card-body),
:deep(.p-card-content),
:deep(.kit-fs-frame__body) {
  height: 100%;
  min-height: 0;
}

iframe {
  border: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 12rem;
}

.win11-window-iframe__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 8rem;
  color: var(--p-text-muted-color, #888);
  font-size: 0.875rem;
}
</style>
