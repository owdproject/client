<script setup lang="ts">
defineProps<{
  application: ApplicationController
}>()
</script>

<template>
  <ListItem>
    {{application.config.name}}
  </ListItem>
</template>

<style scoped lang="scss">

</style>