<script setup lang="ts">
import { useTemplateRef } from 'vue'

defineProps<{
  size?: 'default' | 'large'
  placeholder?: string
  ariaLabel?: string
}>()

const model = defineModel<string>({ required: true })
const inputRef = useTemplateRef('inputRef')

function focus() {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <label
    class="nova-start-search"
    :class="{ 'nova-start-search--large': size === 'large' }"
  >
    <Icon
      name="mdi:magnify"
      :size="size === 'large' ? 22 : 18"
      class="nova-start-search__icon"
      aria-hidden="true"
    />
    <input
      ref="inputRef"
      v-model="model"
      type="search"
      class="nova-start-search__input"
      :placeholder="placeholder"
      :aria-label="ariaLabel ?? placeholder"
      autocomplete="off"
      :enterkeyhint="size === 'large' ? 'search' : undefined"
    />
  </label>
</template>
