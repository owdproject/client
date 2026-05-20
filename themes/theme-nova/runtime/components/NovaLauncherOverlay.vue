<script setup lang="ts">
import { watch, useTemplateRef } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { useNovaStartMenu } from '../composables/useNovaStartMenu'
import NovaStartSearchField from './NovaStartSearchField.vue'
import NovaStartAppTile from './NovaStartAppTile.vue'

const {
  open,
  searchQuery,
  filteredEntries,
  allEntries,
  close,
  launchEntry,
} = useNovaStartMenu()

const panelRef = useTemplateRef('panelRef')
const searchRef = useTemplateRef('searchRef')

onKeyStroke('Escape', () => {
  if (open.value) close()
})

watch(open, (isOpen) => {
  if (!isOpen) return
  requestAnimationFrame(() => searchRef.value?.focus())
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="nova-launcher"
      role="dialog"
      :aria-label="$t('systemBar.launcher.panelLabel')"
    >
      <button
        type="button"
        class="nova-launcher__backdrop"
        :aria-label="$t('systemBar.launcher.close')"
        @click="close()"
      />

      <div ref="panelRef" class="nova-launcher__panel">
        <header class="nova-launcher__header">
          <div class="nova-launcher__header-row">
            <div class="nova-launcher__header-text">
              <h2 class="nova-launcher__heading">
                {{ $t('systemBar.launcher.panelLabel') }}
              </h2>
              <p class="nova-launcher__subheading">
                {{ $t('systemBar.launcher.subheading') }}
              </p>
            </div>
            <button
              type="button"
              class="nova-launcher__close"
              :aria-label="$t('systemBar.launcher.close')"
              @click="close()"
            >
              <Icon name="mdi:close" :size="22" />
            </button>
          </div>
          <NovaStartSearchField
            ref="searchRef"
            v-model="searchQuery"
            size="large"
            :placeholder="$t('systemBar.start.searchPlaceholder')"
            :aria-label="$t('systemBar.start.searchLabel')"
          />
        </header>

        <div class="nova-launcher__body">
          <div
            v-if="filteredEntries.length === 0"
            class="nova-start-empty"
            role="status"
          >
            <Icon
              :name="allEntries.length === 0 ? 'mdi:application-outline' : 'mdi:magnify-close'"
              :size="40"
              class="nova-start-empty__icon"
              aria-hidden="true"
            />
            <span>{{
              allEntries.length === 0
                ? $t('systemBar.start.emptyApps')
                : $t('systemBar.start.emptySearch')
            }}</span>
          </div>

          <ul
            v-else
            class="nova-launcher__grid"
            role="listbox"
          >
            <li
              v-for="(entry, index) in filteredEntries"
              :key="`${entry.application.id}:${entry.command}:${index}`"
              role="presentation"
            >
              <NovaStartAppTile
                :entry="entry"
                layout="grid"
                @select="launchEntry"
              />
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>
