<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  address: string
}>()

const addressInput = ref(props.address)

watch(() => props.address, (address) => {
  addressInput.value = address
})
</script>

<template>
  <div>
    <div class="flex">
      <div class="flex-col px-1" style="align-items: center; display: grid">
        {{$t('apps.explorer.address')}}
      </div>
      <div class="flex-col w-full">
        <InputText
          v-model="addressInput" style="width: inherit"
          spellcheck="false"
          @keydown.enter="$emit('update:modelValue', addressInput)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
