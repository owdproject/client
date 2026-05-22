<script setup lang="ts">

</script>

<template>
  <div class="owd-docs-container text-center">
    <div class="py-16">

      <h2 class="text-4xl font-bold mb-5">
        Built with top-class libraries
      </h2>
      <p class="text-lg mb-16 opacity-50">
        Open Web Desktop is an open source framework designed to provide a simple environment<br />
        for building web-based desktop experiences using Vue.js, Pinia, Tailwind and other awesome libraries.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <DocsCard
            title="Develop with Nuxt"
            description="Open Web Desktop is built on top of Nuxt, which is based on the well known Vue.js library to achieve reactive, scalable, and robust web applications."
            link="https://nuxt.com"
            color="#00DC82"
        >
          <Icon name="simple-icons:nuxt" :size="20" />
        </DocsCard>
        <DocsCard
            title="Compose with PrimeVue"
            description="Open Web Desktop adopts PrimeVue to effortlessly enable rich and interactive user interfaces through its comprehensive suite of Vue.js components."
            link="https://primevue.org"
            color="#2d4b6b"
        >
          <Icon name="simple-icons:primevue" :size="18" />
        </DocsCard>
        <DocsCard
            title="Style with Tailwind"
            description="Style your application rapidly and intuitively with Tailwind CSS, a utility-first framework that lets you apply styles directly within your HTML."
            link="https://tailwindcss.com"
            color="#06b6d4"
        >
          <Icon name="simple-icons:tailwindcss" :size="18" />
        </DocsCard>
      </div>

    </div>
  </div>
</template>

<style scoped lang="scss">

</style>