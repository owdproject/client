<script setup lang="ts">
import { useWasmboy } from 'owd-app-wasmboy/composables/useWasmboy'
import { useWasmboyStore } from 'owd-app-wasmboy/stores/storeWasmboy'

const wasmboy = useWasmboy()
const wasmboyStore = useWasmboyStore()
</script>

<template>
  <div class="mb-2">
    <b>General</b>
  </div>

  <div class="mb-2">
    <label>
      <Checkbox binary v-model="wasmboyStore.config.isGbcColorizationEnabled" />
      GameBoy Color colorization enabled
    </label>
  </div>

  <div>
    <label>
      <Checkbox binary v-model="wasmboyStore.config.gameTitleAsWindowName" />
      Set game title as window name
    </label>
  </div>

  <div class="mt-4 mb-2">
    <b>Screen</b>
  </div>

  <ButtonGroup>
    <Button
      :class="{
        'p-button--active': wasmboyStore.config.screenSize === 1,
      }"
      label="1x"
      @click="wasmboyStore.config.screenSize = 1"
    />
    <Button
      :class="{
        'p-button--active': wasmboyStore.config.screenSize === 1.5,
      }"
      label="1.5x"
      @click="wasmboyStore.config.screenSize = 1.5"
    />
    <Button
      :class="{
        'p-button--active': wasmboyStore.config.screenSize === 2,
      }"
      label="2x"
      @click="wasmboyStore.config.screenSize = 2"
    />
  </ButtonGroup>

  <div class="mt-4 mb-2">
    <b>Speed</b>
  </div>

  <ButtonGroup>
    <Button
      :class="{ 'p-button--active': wasmboyStore.config.speed === 0.5 }"
      label="0.5x"
      @click="wasmboy.setSpeed(0.5)"
    />
    <Button
      :class="{ 'p-button--active': wasmboyStore.config.speed === 0.7 }"
      label="0.7x"
      @click="wasmboy.setSpeed(0.7)"
    />
    <Button
      :class="{ 'p-button--active': wasmboyStore.config.speed === 0.8 }"
      label="0.8x"
      @click="wasmboy.setSpeed(0.8)"
    />
    <Button
      :class="{ 'p-button--active': wasmboyStore.config.speed === 1 }"
      label="1.0x"
      @click="wasmboy.setSpeed(1)"
    />
  </ButtonGroup>
</template>

<style scoped lang="scss"></style>
