<script setup lang="ts">
const props = defineProps<{
  categories: string[]
  active?: string
}>()

const emit = defineEmits<{
  select: [category: string]
}>()

function onCategorySelect(category: string) {
  emit('select', category)
}
</script>

<template>
  <List>
    <ListItem
      v-for="category of categories"
      :key="category"
      :class="{ 'owd-system-bar__category--active': category === props.active }"
      @mouseenter="onCategorySelect(category)"
      @click="onCategorySelect(category)"
    >
      {{ $t(`applications.categories.${category}`) }}
    </ListItem>
  </List>
</template>

<style scoped lang="scss">
.owd-system-bar__category--active,
.owd-list-item:hover {
  border-radius: 8px;
  background: rgba(var(--owd-hover-background-color));
}
</style>