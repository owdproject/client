<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useBattery } from '@vueuse/core'
import { useDesktopVolumeStore } from '@owdproject/core/runtime/stores/storeDesktopVolume'
import { useDesktopWorkspaceStore } from '@owdproject/core/runtime/stores/storeDesktopWorkspace'
import { useNovaQuickSettings } from '../composables/useNovaQuickSettings'
import { useNovaAccentTheme, NOVA_ACCENT_META } from '../composables/useNovaAccentTheme'
import { useNovaTrayClock } from '../composables/useNovaTrayClock'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import { useNovaWorkspaces } from '../composables/useNovaWorkspaces'
import { useNovaTrayLayout } from '../composables/useNovaTrayLayout'
import NovaTrayWorkspaceButton from './NovaTrayWorkspaceButton.vue'
import NovaQuickSettingsPanel from './NovaQuickSettingsPanel.vue'
import NovaTrayMoreMenu from './NovaTrayMoreMenu.vue'

const {
  open: quickSettingsOpen,
  close: closeQuickSettings,
  toggle: toggleQuickSettings,
} = useNovaQuickSettings()
const { accentId, cycleAccent } = useNovaAccentTheme()
const { open: startMenuOpen } = useNovaStartMenu()
const { enabled: workspacesEnabled } = useNovaWorkspaces()
const { isCompact, isNarrow, isMedium } = useNovaTrayLayout()
const desktopWorkspaceStore = useDesktopWorkspaceStore()

const trayRef = useTemplateRef('trayRef')
const panelRef = useTemplateRef('panelRef')
const { time, dateLabel } = useNovaTrayClock()
const { charging, level, isSupported: batterySupported } = useBattery()
const desktopVolumeStore = useDesktopVolumeStore()

const accentIcon = computed(() => NOVA_ACCENT_META[accentId.value].icon)

const batteryPercent = computed(() =>
  level.value != null ? Math.round(level.value * 100) : null,
)

const showBattery = computed(
  () => batterySupported.value && batteryPercent.value != null,
)

onClickOutside(
  panelRef,
  () => closeQuickSettings(),
  { ignore: [trayRef] },
)

onKeyStroke('Escape', () => {
  if (quickSettingsOpen.value) {
    closeQuickSettings()
    return
  }
})

watch(startMenuOpen, (isOpen) => {
  if (isOpen) closeQuickSettings()
})

watch(
  () => desktopWorkspaceStore.overview,
  (isOpen) => {
    if (isOpen) closeQuickSettings()
  },
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
  closeQuickSettings()
  cycleAccent()
}
</script>

<template>
  <div ref="trayRef" class="nova-top-bar__tray">
    <div class="nova-top-bar__tray-inner">
      <NovaTrayMoreMenu v-if="isCompact" class="nova-tray-item--compact-only">
        <NovaTrayWorkspaceButton v-if="workspacesEnabled" />

        <button
          v-if="showBattery"
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
          :class="{ 'nova-tray-btn--active': quickSettingsOpen }"
          :aria-expanded="quickSettingsOpen"
          :aria-label="$t('systemBar.tray.volume')"
          @click.stop="toggleQuickSettings()"
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
      </NovaTrayMoreMenu>

      <NovaTrayWorkspaceButton
        v-if="workspacesEnabled && !isCompact"
        class="nova-tray-item--wide-only"
      />

      <span
        v-if="workspacesEnabled && !isCompact"
        class="nova-top-bar__tray-divider nova-tray-item--wide-only"
        aria-hidden="true"
      />

      <button
        v-if="showBattery && !isCompact"
        type="button"
        class="nova-tray-btn nova-tray-item--wide-only"
        :aria-label="$t('systemBar.tray.battery')"
      >
        <Icon :name="batteryIcon" :size="18" />
        <span
          class="nova-top-bar__status-percent"
          :class="{ 'nova-tray-item--hide-narrow': isNarrow }"
        >
          {{ batteryPercent }}%
        </span>
      </button>

      <button
        v-if="!isCompact"
        type="button"
        class="nova-tray-btn nova-tray-item--wide-only"
        :class="{ 'nova-tray-btn--active': quickSettingsOpen }"
        :aria-expanded="quickSettingsOpen"
        :aria-label="$t('systemBar.tray.volume')"
        @click.stop="toggleQuickSettings()"
      >
        <Icon :name="volumeIcon" :size="18" />
      </button>

      <button
        v-if="!isCompact && !isMedium"
        type="button"
        class="nova-tray-btn nova-tray-item--wide-only"
        :aria-label="$t('systemBar.tray.network')"
        disabled
      >
        <Icon name="mdi:wifi-strength-4" :size="18" />
      </button>

      <span
        class="nova-top-bar__tray-divider"
        :class="{ 'nova-tray-item--compact-hide': isCompact }"
        aria-hidden="true"
      />

      <div class="nova-top-bar__clock" :title="dateLabel">
        <time class="nova-top-bar__clock-time">{{ time }}</time>
        <span
          class="nova-top-bar__clock-date"
          :class="{ 'nova-tray-item--hide-narrow': isNarrow }"
        >
          {{ dateLabel }}
        </span>
      </div>

      <button
        type="button"
        class="nova-tray-btn"
        :class="{ 'nova-tray-btn--active': quickSettingsOpen }"
        :aria-expanded="quickSettingsOpen"
        :aria-label="$t('systemBar.tray.account')"
        @click.stop="toggleQuickSettings()"
      >
        <Icon name="mdi:account-circle-outline" :size="18" />
      </button>

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
        v-if="quickSettingsOpen"
        ref="panelRef"
        class="nova-top-bar__settings-anchor"
      >
        <NovaQuickSettingsPanel @close="closeQuickSettings()" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.nova-top-bar__tray {
  display: flex;
  flex: 0 0 auto;
  margin-left: auto;
  min-width: 0;
  max-width: 100%;
  color: inherit;
}

.nova-top-bar__tray-inner {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  flex-wrap: nowrap;
}

.nova-tray-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  flex-shrink: 0;
  transition: background 0.15s ease;

  &:hover,
  &--active {
    background: rgba(255, 255, 255, 0.12);
  }

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }

  &--accent:hover {
    background: var(--nova-accent-muted, rgba(255, 255, 255, 0.12));
  }
}

.nova-top-bar__tray-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.14);
  flex-shrink: 0;

  &.nova-tray-item--compact-hide {
    @media (max-width: 599px) {
      display: none;
    }
  }
}

.nova-top-bar__clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  padding: 0 6px 0 4px;
  line-height: 1.15;
  flex-shrink: 0;
}

.nova-top-bar__clock-time {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.nova-top-bar__clock-date {
  font-size: 10px;
  opacity: 0.55;
  white-space: nowrap;
}

.nova-top-bar__status-percent {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  margin-left: 2px;
}

.nova-tray-item--hide-narrow {
  @media (max-width: 719px) {
    display: none;
  }
}
</style>
