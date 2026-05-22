<script setup lang="ts">
import { withDefaults } from 'vue'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'

const props = withDefaults(
  defineProps<{
    window?: IWindowController
    content?: unknown
    chromePadding?: boolean
  }>(),
  { chromePadding: true },
)
</script>

<template>
  <Frame
    :window="props.window"
    :content="props.content"
    :chrome-padding="props.chromePadding"
  >
    <template #nav-prepend>
      <slot name="nav-prepend" />
    </template>
    <template #nav-append>
      <slot name="nav-append" />
    </template>
    <slot />
  </Frame>
</template>
