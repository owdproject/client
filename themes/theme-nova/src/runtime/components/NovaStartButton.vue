<script setup lang="ts">
import { useNovaStartMenu } from '../composables/useNovaStartMenu'

const { open, toggle } = useNovaStartMenu()
</script>

<template>
  <button
    type="button"
    class="nova-start-btn"
    :class="{ 'nova-start-btn--active': open }"
    :aria-expanded="open"
    aria-haspopup="dialog"
    @click.stop="toggle()"
  >
    <Icon
      name="mdi:view-grid-outline"
      :size="18"
      class="nova-start-btn__icon"
      aria-hidden="true"
    />
    <span class="nova-start-btn__label">{{ $t('systemBar.start.button') }}</span>
  </button>
</template>
