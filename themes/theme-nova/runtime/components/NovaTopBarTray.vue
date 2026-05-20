<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useBattery } from '@vueuse/core'
import { useDesktopVolumeStore } from '@owdproject/core/runtime/stores/storeDesktopVolume'
import { useNovaQuickSettings } from '../composables/useNovaQuickSettings'
import { useNovaAccentTheme, NOVA_ACCENT_META } from '../composables/useNovaAccentTheme'
import { useNovaTrayClock } from '../composables/useNovaTrayClock'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import NovaTrayWorkspaceButton from './NovaTrayWorkspaceButton.vue'
import NovaQuickSettingsPanel from './NovaQuickSettingsPanel.vue'

const quickSettings = useNovaQuickSettings()
const { accentId, cycleAccent } = useNovaAccentTheme()
const { open: startMenuOpen } = useNovaStartMenu()
const trayRef = useTemplateRef('trayRef')
const panelRef = useTemplateRef('panelRef')
const { time, dateLabel } = useNovaTrayClock()
const { charging, level, isSupported: batterySupported } = useBattery()
const desktopVolumeStore = useDesktopVolumeStore()

const accentIcon = computed(() => NOVA_ACCENT_META[accentId.value].icon)

onClickOutside(
  panelRef,
  () => quickSettings.close(),
  { ignore: [trayRef] },
)

onKeyStroke('Escape', () => {
  if (quickSettings.open.value) quickSettings.close()
})

watch(startMenuOpen, (isOpen) => {
  if (isOpen) quickSettings.close()
})

const batteryPercent = computed(() =>
  level.value != null ? Math.round(level.value * 100) : null,
)

const batteryIcon = computed(() => {
  if (batteryPercent.value == null) return 'mdi:battery-unknown'
  const tens = Math.floor(batteryPercent.value / 10) * 10
  const suffix = charging.value ? '-charging' : ''
  return `mdi:battery${suffix}-${tens}`
})

const volumeIcon = computed(() => {
  const v = desktopVolumeStore.master
  if (v <= 0) return 'mdi:volume-off'
  if (v < 35) return 'mdi:volume-low'
  if (v < 70) return 'mdi:volume-medium'
  return 'mdi:volume-high'
})

function onAccentClick() {
  quickSettings.close()
  cycleAccent()
}
</script>

<template>
  <div ref="trayRef" class="nova-top-bar__tray">
    <div class="nova-top-bar__tray-inner">
      <NovaTrayWorkspaceButton />

      <span class="nova-top-bar__tray-divider" aria-hidden="true" />

      <button
        v-if="batterySupported && batteryPercent != null"
        type="button"
        class="nova-tray-btn"
        :aria-label="$t('systemBar.tray.battery')"
      >
        <Icon :name="batteryIcon" :size="18" />
        <span class="nova-top-bar__status-percent">{{ batteryPercent }}%</span>
      </button>

      <button
        type="button"
        class="nova-tray-btn"
        :class="{ 'nova-tray-btn--active': quickSettings.open }"
        :aria-expanded="quickSettings.open"
        :aria-label="$t('systemBar.tray.volume')"
        @click.stop="quickSettings.toggle()"
      >
        <Icon :name="volumeIcon" :size="18" />
      </button>

      <button
        type="button"
        class="nova-tray-btn"
        :aria-label="$t('systemBar.tray.network')"
        disabled
      >
        <Icon name="mdi:wifi-strength-4" :size="18" />
      </button>

      <span class="nova-top-bar__tray-divider" aria-hidden="true" />

      <div class="nova-top-bar__clock" :title="dateLabel">
        <time class="nova-top-bar__clock-time">{{ time }}</time>
        <span class="nova-top-bar__clock-date">{{ dateLabel }}</span>
      </div>

      <button
        type="button"
        class="nova-tray-btn nova-tray-btn--accent"
        :aria-label="$t('systemBar.tray.cycleAccent', { accent: $t(`systemBar.tray.accents.${accentId}`) })"
        @click.stop="onAccentClick()"
      >
        <Icon :name="accentIcon" :size="18" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="quickSettings.open"
        ref="panelRef"
        class="nova-top-bar__settings-anchor"
      >
        <NovaQuickSettingsPanel @close="quickSettings.close()" />
      </div>
    </Teleport>
  </div>
</template>
