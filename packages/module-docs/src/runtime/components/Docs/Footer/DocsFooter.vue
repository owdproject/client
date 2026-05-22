<script setup lang="ts">

</script>

<template>
  <DocsDivider class="mt-16" />

  <footer class="py-6">
    <div class="owd-docs-container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div class="text-center md:text-left">
        Open Web Desktop is released under the MIT License.
      </div>
      <div class="text-center md:text-right">
        <ul class="flex items-center justify-center md:justify-end space-x-4">
          <li><a href="https://github.com/owdproject" target="_blank">About</a></li>
          <li><nuxt-link to="/docs/getting-started">Docs</nuxt-link></li>
          <li><a href="mailto:licensing@owdproject.org">Get a license</a></li>
        </ul>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">

</style>