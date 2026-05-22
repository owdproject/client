<script setup lang="ts">
import { computed, watch, useTemplateRef } from 'vue'
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

const CATEGORY_ORDER = [
  'favorites',
  'productivity',
  'accessories',
  'internet',
  'office',
  'games',
  'graphics',
  'programming',
  'system-tools',
  'utilities',
  'tools',
  'other',
] as const

const groupedSections = computed(() => {
  const groups = new Map<string, ApplicationEntryWithInherited[]>()

  for (const entry of filteredEntries.value) {
    const key = entry.category || 'other'
    const list = groups.get(key) ?? []
    list.push(entry)
    groups.set(key, list)
  }

  const keys = [...groups.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number])
    const bi = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number])
    const ar = ai === -1 ? 99 : ai
    const br = bi === -1 ? 99 : bi
    return ar - br
  })

  return keys.map((category) => ({
    category,
    entries: groups.get(category)!,
  }))
})

const showGrouped = computed(
  () => !searchQuery.value.trim() && groupedSections.value.length > 1,
)

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
      :aria-label="$t('systemBar.start.panelLabel')"
    >
      <button
        type="button"
        class="nova-launcher__backdrop"
        :aria-label="$t('systemBar.start.close')"
        @click="close()"
      />

      <div ref="panelRef" class="nova-launcher__panel">
        <header class="nova-launcher__header">
          <div class="nova-launcher__header-row">
            <h2 class="nova-launcher__heading">
              {{ $t('systemBar.start.panelLabel') }}
            </h2>
            <button
              type="button"
              class="nova-launcher__close"
              :aria-label="$t('systemBar.start.close')"
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

          <template v-else-if="showGrouped">
            <section
              v-for="section in groupedSections"
              :key="section.category"
              class="nova-launcher__section"
            >
              <span class="nova-launcher__section-label">
                {{ $t(`applications.categories.${section.category}`, section.category) }}
              </span>
              <ul class="nova-launcher__grid" role="listbox">
                <li
                  v-for="(entry, index) in section.entries"
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
            </section>
          </template>

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
