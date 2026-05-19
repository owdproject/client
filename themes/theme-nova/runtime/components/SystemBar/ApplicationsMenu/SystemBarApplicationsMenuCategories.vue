<script setup lang="ts">
defineProps<{
  categories: string[],
}>()

const emit = defineEmits(['select']);

const onCategorySelect = (category: string) => {
  emit('select', category)
};
</script>

<template>
  <List>
    <ListItem
        v-for="category of categories" :key="category"
        @mouseenter="onCategorySelect(category)"
    >
      {{ $t(`applications.categories.${category}`) }}
    </ListItem>
  </List>
</template>