<script setup lang="ts">
import { useDesktopStore } from '@owdproject/core/runtime/stores/storeDesktop'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const desktopStore = useDesktopStore()
const { t } = useI18n()

const personalization = computed(() => desktopStore.state.personalization)

const tintPresets = [
  '#2d2d30',
  '#3a2f3f',
  '#2f3848',
  '#36422e',
  '#3f3427',
]

function setSurface(value: 'acrylic' | 'solid') {
  desktopStore.setWindowSurface(value)
}

function setAppearance(value: 'dark' | 'light') {
  desktopStore.setAppearance(value)
}

function setTint(value: string) {
  desktopStore.setWindowTint(value)
}
</script>

<template>
  <section class="win11-settings-p13n">
    <h3 class="win11-settings-p13n__title">
      {{ t('win11.settings.personalization.windowEffectTitle') }}
    </h3>
    <div class="win11-settings-p13n__row">
      <label class="win11-settings-p13n__opt">
        <input
          type="radio"
          name="windowSurface"
          :checked="personalization.windowSurface === 'acrylic'"
          @change="setSurface('acrylic')"
        />
        <span>{{ t('win11.settings.personalization.windowEffectAcrylic') }}</span>
      </label>
      <label class="win11-settings-p13n__opt">
        <input
          type="radio"
          name="windowSurface"
          :checked="personalization.windowSurface === 'solid'"
          @change="setSurface('solid')"
        />
        <span>{{ t('win11.settings.personalization.windowEffectSolid') }}</span>
      </label>
    </div>

    <div v-if="personalization.windowSurface === 'solid'" class="win11-settings-p13n__tint">
      <p class="win11-settings-p13n__subtitle">
        {{ t('win11.settings.personalization.tintTitle') }}
      </p>
      <div class="win11-settings-p13n__swatches">
        <button
          v-for="preset in tintPresets"
          :key="preset"
          type="button"
          class="win11-settings-p13n__swatch"
          :title="preset"
          :style="{ background: preset }"
          @click="setTint(preset)"
        />
        <input
          type="color"
          class="win11-settings-p13n__picker"
          :value="personalization.windowTint"
          :aria-label="t('win11.settings.personalization.customTint')"
          @input="setTint(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <h3 class="win11-settings-p13n__title">
      {{ t('win11.settings.personalization.appearanceTitle') }}
    </h3>
    <div class="win11-settings-p13n__row">
      <label class="win11-settings-p13n__opt">
        <input
          type="radio"
          name="appearance"
          :checked="personalization.appearance === 'dark'"
          @change="setAppearance('dark')"
        />
        <span>{{ t('win11.settings.personalization.appearanceDark') }}</span>
      </label>
      <label class="win11-settings-p13n__opt">
        <input
          type="radio"
          name="appearance"
          :checked="personalization.appearance === 'light'"
          @change="setAppearance('light')"
        />
        <span>{{ t('win11.settings.personalization.appearanceLight') }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped lang="scss">
.win11-settings-p13n {
  display: grid;
  gap: 10px;
}

.win11-settings-p13n__title {
  margin: 10px 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.win11-settings-p13n__subtitle {
  margin: 2px 0;
  font-size: 12px;
  opacity: 0.78;
}

.win11-settings-p13n__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.win11-settings-p13n__opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.win11-settings-p13n__tint {
  display: grid;
  gap: 8px;
}

.win11-settings-p13n__swatches {
  display: flex;
  align-items: center;
  gap: 8px;
}

.win11-settings-p13n__swatch {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.34);
}

.win11-settings-p13n__picker {
  width: 28px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
}
</style>
