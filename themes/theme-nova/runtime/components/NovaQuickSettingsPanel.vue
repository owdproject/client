<script setup lang="ts">
import { computed } from 'vue'
import { useBattery } from '@vueuse/core'
import { useDesktopVolumeStore } from '@owdproject/core/runtime/stores/storeDesktopVolume'
import { useDesktopShellIdentity } from '@owdproject/kit-theme/runtime/composables/useDesktopShellIdentity'
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

const { charging, level } = useBattery()
const desktopVolumeStore = useDesktopVolumeStore()
const { displayName, avatarUrl, isGuest } = useDesktopShellIdentity()

const volume = ref(desktopVolumeStore.master)
const saveMasterVolumeDebounced = useDebounceFn(
  () => desktopVolumeStore.setMasterVolume(volume.value),
  250,
)

watch(
  () => volume.value,
  () => saveMasterVolumeDebounced(),
)

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
  if (volume.value <= 0) return 'mdi:volume-off'
  if (volume.value < 35) return 'mdi:volume-low'
  if (volume.value < 70) return 'mdi:volume-medium'
  return 'mdi:volume-high'
})

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="nova-quick-settings" role="dialog" :aria-label="$t('systemBar.settings.label')">
    <section class="nova-quick-settings__user">
      <div class="nova-quick-settings__avatar" aria-hidden="true">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          alt=""
          class="nova-quick-settings__avatar-img"
        />
        <Icon v-else name="mdi:account-circle" :size="36" />
      </div>
      <div class="nova-quick-settings__user-text">
        <span class="nova-quick-settings__user-name">{{ displayName }}</span>
        <span v-if="isGuest" class="nova-quick-settings__user-badge">
          {{ $t('systemBar.tray.guest') }}
        </span>
      </div>
    </section>

    <section class="nova-quick-settings__row" :aria-label="$t('systemBar.tray.volume')">
      <Icon :name="volumeIcon" :size="20" class="nova-quick-settings__row-icon" />
      <Slider v-model="volume" :min="0" :max="100" class="nova-quick-settings__slider" />
      <span class="nova-quick-settings__value">{{ volume }}%</span>
    </section>

    <section
      v-if="batteryPercent != null"
      class="nova-quick-settings__row nova-quick-settings__row--static"
      :aria-label="$t('systemBar.tray.battery')"
    >
      <Icon :name="batteryIcon" :size="20" class="nova-quick-settings__row-icon" />
      <span class="nova-quick-settings__battery-label">
        {{
          charging
            ? $t('systemBar.tray.batteryCharging', { percent: batteryPercent })
            : $t('systemBar.tray.batteryLevel', { percent: batteryPercent })
        }}
      </span>
    </section>
  </div>
</template>

<style scoped lang="scss">
.nova-quick-settings {
  min-width: 280px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--owd-surface-900);
  border: 1px solid var(--owd-surface-700);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.nova-quick-settings__user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--owd-surface-700);
}

.nova-quick-settings__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  opacity: 0.9;
}

.nova-quick-settings__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nova-quick-settings__user-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.nova-quick-settings__user-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

.nova-quick-settings__user-badge {
  font-size: 11px;
  opacity: 0.55;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nova-quick-settings__row {
  display: flex;
  align-items: center;
  gap: 10px;

  & + & {
    margin-top: 12px;
  }

  &--static {
    opacity: 0.9;
  }
}

.nova-quick-settings__row-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.nova-quick-settings__slider {
  flex: 1;
  min-width: 0;
}

.nova-quick-settings__value {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  min-width: 2.5rem;
  text-align: right;
}

.nova-quick-settings__battery-label {
  font-size: 13px;
}
</style>
