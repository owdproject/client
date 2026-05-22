<script setup lang="ts">
defineProps<{
  post: any
}>()
</script>

<template>
  <DocsLayoutDefault>
    <template #sidebar>
      <div>
        <b>
          Table of contents
        </b>
      </div>

      <i>Work in progress</i>
    </template>

    <template v-slot="{ post }">

      <ContentRenderer
          style="filter: grayscale(0.6) contrast(4);"
          class="m-3"
          :value="post"
      />

    </template>
  </DocsLayoutDefault>
</template>

<style scoped lang="scss">

</style>