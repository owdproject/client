<script setup lang="ts">
defineProps<{
  entry: ApplicationEntryWithInherited
}>()
</script>

<template>
  <ListItem>
    <Icon :name="entry.icon" />
    {{ entry.title }}
  </ListItem>
</template>

<style scoped lang="scss">
.iconify {
  vertical-align: -3px;
  font-size: 18px;
  margin-right: 8px;
}
</style>
