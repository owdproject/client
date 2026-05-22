<script setup lang="ts">
defineProps<{
  icon: {
    name: string
    size: number
  }
  title: string
  description: string
}>()
</script>

<template>
  <div class="flex flex-row">
    <div class="grid items-center" style="width: 32px;">
      <Icon v-bind="icon" />
    </div>
    <div class="flex-1 pl-3">
      <div class="font-bold text-lg opacity-70" v-text="title" />
      <div class="opacity-50" v-text="description" />
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>