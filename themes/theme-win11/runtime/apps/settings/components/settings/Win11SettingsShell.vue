<script setup lang="ts">
import type { IWindowController, WindowConfig } from '@owdproject/core'
import Frame from '@owdproject/kit-fs/runtime/components/explorer/Frame.vue'
import Win11SettingsPersonalization from './Win11SettingsPersonalization.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  config?: WindowConfig
  window: IWindowController
}>()

const sections = [
  { id: 'system' as const, label: 'System' },
  { id: 'personalization' as const, label: 'Personalization' },
]

const active = ref<(typeof sections)[number]['id']>('system')
const { t } = useI18n()
</script>

<template>
  <Frame :window="window" :config="config">
    <div class="win11-settings-shell flex h-full min-h-0">
      <aside
        class="win11-settings-shell__nav flex flex-col gap-1 w-52 shrink-0 border-r border-solid border-[rgba(255,255,255,0.1)] p-3"
      >
        <button
          v-for="s in sections"
          :key="s.id"
          type="button"
          class="text-left rounded px-3 py-2 text-sm transition-colors"
          :class="
            active === s.id
              ? 'bg-[rgba(255,255,255,0.12)] font-medium'
              : 'hover:bg-[rgba(255,255,255,0.08)]'
          "
          @click="active = s.id"
        >
          {{
            s.id === 'system'
              ? t('win11.settings.system')
              : t('win11.settings.personalization.title')
          }}
        </button>
      </aside>
      <main
        class="win11-settings-shell__content flex-1 min-w-0 overflow-auto p-6"
      >
        <h2 class="text-lg font-semibold mb-3">
          {{
            active === 'system'
              ? t('win11.settings.system')
              : t('win11.settings.personalization.title')
          }}
        </h2>
        <p v-if="active === 'system'" class="text-sm opacity-80">
          {{ t('win11.settings.systemPlaceholder') }}
        </p>
        <Win11SettingsPersonalization v-else />
      </main>
    </div>
  </Frame>
</template>
