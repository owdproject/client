<script setup lang="ts">
defineProps<{
  application: IApplicationController
}>()
</script>

<template>
  <ListItem>
    <Icon :name="application.config.icon"/>
    {{ application.config.name }}
  </ListItem>
</template>

<style scoped lang="scss">
.iconify {
  vertical-align: -3px;
  font-size: 18px;
  margin-right: 8px;
}
</style>