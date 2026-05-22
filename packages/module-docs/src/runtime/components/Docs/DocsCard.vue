<script setup lang="ts">
defineProps<{
  title: string
  description: string
  link: string
  color?: string
}>();
</script>

<template>
  <div class="owd-docs-card rounded-lg text-left p-6">
    <div class="flex items-center mb-4">
      <div class="owd-docs-card__icon rounded-full flex items-center justify-center mr-4">
        <slot />
      </div>
      <h3
          class="owd-docs-card__text text-lg font-semibold"
          v-text="title"
      />
    </div>
    <p class="mb-4">
      {{ description }}
    </p>
    <a
        :href="link"
        class="owd-docs-card__link"
        target="_blank"
        rel="noopener noreferrer"
    >
      {{ link.replace(/^https?:\/\//, '') }}
    </a>
  </div>
</template>

<style scoped lang="scss">
.owd-docs-card__icon {
  width: 32px;
  height: 32px;
  background: v-bind(color);
}

.owd-docs-card__link {
  color: v-bind(color);
}
</style>