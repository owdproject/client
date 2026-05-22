<script setup lang="ts">
defineProps<{
  entry: ApplicationEntryWithInherited
  layout?: 'row' | 'grid'
}>()

const emit = defineEmits<{
  select: [entry: ApplicationEntryWithInherited]
}>()
</script>

<template>
  <button
    type="button"
    class="nova-start-tile"
    :class="{ 'nova-start-tile--grid': layout === 'grid' }"
    role="option"
    @click="emit('select', entry)"
  >
    <span class="nova-start-tile__icon-wrap" aria-hidden="true">
      <Icon
        v-if="entry.icon"
        :name="entry.icon"
        :size="layout === 'grid' ? 28 : 22"
      />
      <Icon v-else name="mdi:application-outline" :size="layout === 'grid' ? 28 : 22" />
    </span>
    <span class="nova-start-tile__text">
      <span class="nova-start-tile__title">{{ entry.title }}</span>
      <span v-if="entry.category" class="nova-start-tile__meta">
        {{ $t(`applications.categories.${entry.category}`, entry.category) }}
      </span>
    </span>
  </button>
</template>
