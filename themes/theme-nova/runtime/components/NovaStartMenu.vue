<script setup lang="ts">
import { computed, watch, useTemplateRef } from 'vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
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
  const q = searchQuery.value.trim()
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

onClickOutside(panelRef, () => {
  if (open.value) close()
})

onKeyStroke('Escape', () => {
  if (open.value) close()
})

watch(open, (isOpen) => {
  if (isOpen) {
    requestAnimationFrame(() => searchRef.value?.focus())
  }
})
</script>

<template>
  <div
    v-if="open"
    ref="panelRef"
    class="nova-start-menu"
    role="dialog"
    :aria-label="$t('systemBar.start.panelLabel')"
  >
    <header class="nova-start-menu__header">
      <p class="nova-start-menu__title">{{ $t('systemBar.start.panelLabel') }}</p>
      <NovaStartSearchField
        ref="searchRef"
        v-model="searchQuery"
        :placeholder="$t('systemBar.start.searchPlaceholder')"
        :aria-label="$t('systemBar.start.searchLabel')"
      />
    </header>

    <div class="nova-start-menu__body">
      <div
        v-if="filteredEntries.length === 0"
        class="nova-start-empty"
        role="status"
      >
        <Icon
          :name="allEntries.length === 0 ? 'mdi:application-outline' : 'mdi:magnify-close'"
          :size="32"
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
          class="nova-start-menu__section"
        >
          <span class="nova-start-menu__section-label">
            {{ $t(`applications.categories.${section.category}`, section.category) }}
          </span>
          <ul class="nova-start-menu__grid" role="listbox">
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

      <ul v-else class="nova-start-menu__grid" role="listbox">
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
</template>
