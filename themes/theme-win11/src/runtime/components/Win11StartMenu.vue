<script setup lang="ts">
import draggable from 'vuedraggable'
import {
  useWin11StartMenu,
  entryStorageKey,
  type Win11AllAppsView,
} from '../composables/useWin11StartMenu'
import { useI18n } from 'vue-i18n'
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  useTemplateRef,
} from 'vue'
import { onClickOutside, useMagicKeys, whenever } from '@vueuse/core'
import type { UnwrapRef } from 'vue'
import { useWin11ShellUser } from '../composables/useWin11ShellUser'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const { displayName: shellDisplayName, avatarUrl: shellAvatarUrl } =
  useWin11ShellUser()

const {
  apps,
  pinnedEntries,
  recommendedFiles,
  allRecentFiles,
  filterRecentFiles,
  appsByCategory,
  categoryKeysSorted,
  alphabeticalApps,
  allAppsView,
  pinnedIds,
  hydrateFromStorage,
  togglePin,
  isPinned,
  applyPinnedOrder,
  movePinnedLeft,
  movePinnedRight,
  movePinnedToFront,
  launchEntry,
  openRecentFile,
  powerOff,
  formatRecentFileDate,
  formatRecentFileSize,
  recentFileIcon,
} = useWin11StartMenu()

const appsList = apps
type AppEntry = UnwrapRef<typeof appsList>[number]

const startDialog = useTemplateRef<HTMLElement>('startDialog')
const ctxMenuEl = useTemplateRef<HTMLElement>('ctxMenuEl')
const viewDropdownEl = useTemplateRef<HTMLElement>('viewDropdownEl')
const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const scrollRoot = ref<HTMLElement | null>(null)
const pinnedDragList = ref<AppEntry[]>([])
const draggingPinned = ref(false)
let suppressBackdropUntil = 0
const viewPickerOpen = ref(false)
let suppressCloseForSelectUntil = 0

type StartCtxMenu =
  | { variant: 'pinned'; entry: AppEntry }
  | { variant: 'list'; entry: AppEntry }

const ctxMenu = ref<StartCtxMenu | null>(null)
const ctxPos = ref({ x: 0, y: 0 })

onMounted(() => {
  hydrateFromStorage()
})

watch(
  () => props.open,
  async (v) => {
    if (v) {
      hydrateFromStorage()
      searchQuery.value = ''
      await nextTick()
      searchInput.value?.focus()
    } else {
      closeCtxMenu()
      closeViewPicker()
    }
  },
)

function closeCtxMenu() {
  ctxMenu.value = null
}

function openPinnedCtx(e: MouseEvent, entry: AppEntry) {
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = { variant: 'pinned', entry }
  ctxPos.value = { x: e.clientX, y: e.clientY }
}

function openListCtx(e: MouseEvent, entry: AppEntry) {
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = { variant: 'list', entry }
  ctxPos.value = { x: e.clientX, y: e.clientY }
}

function pinnedOrderIndex(entry: AppEntry) {
  return pinnedIds.value.indexOf(entryStorageKey(entry))
}

function canMovePinnedLeft(entry: AppEntry) {
  return pinnedOrderIndex(entry) > 0
}

function canMovePinnedRight(entry: AppEntry) {
  const i = pinnedOrderIndex(entry)
  return i >= 0 && i < pinnedIds.value.length - 1
}

function applyCtxMoveLeft() {
  const m = ctxMenu.value
  if (m?.variant !== 'pinned') return
  movePinnedLeft(m.entry)
  closeCtxMenu()
}

function applyCtxMoveRight() {
  const m = ctxMenu.value
  if (m?.variant !== 'pinned') return
  movePinnedRight(m.entry)
  closeCtxMenu()
}

function applyCtxMoveToFront() {
  const m = ctxMenu.value
  if (m?.variant !== 'pinned') return
  movePinnedToFront(m.entry)
  closeCtxMenu()
}

function applyCtxUnpinFromPinned() {
  const m = ctxMenu.value
  if (m?.variant !== 'pinned') return
  togglePin(m.entry)
  closeCtxMenu()
}

function applyCtxPinFromList() {
  const m = ctxMenu.value
  if (m?.variant !== 'list') return
  if (!isPinned(m.entry)) togglePin(m.entry)
  closeCtxMenu()
}

function applyCtxUnpinFromList() {
  const m = ctxMenu.value
  if (m?.variant !== 'list') return
  if (isPinned(m.entry)) togglePin(m.entry)
  closeCtxMenu()
}

const ctxMenuStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${ctxPos.value.x}px`,
  top: `${ctxPos.value.y}px`,
  zIndex: 200050,
}))

const queryLower = computed(() => searchQuery.value.trim().toLowerCase())

function matchesQuery(entry: AppEntry) {
  if (!queryLower.value) return true
  const t = (entry.title || '').toLowerCase()
  const c = (entry.category || '').toLowerCase()
  return t.includes(queryLower.value) || c.includes(queryLower.value)
}

const shownPinned = computed(() => pinnedEntries.value.filter(matchesQuery))

const shownRecommendedFiles = computed(() => {
  const q = searchQuery.value.trim()
  return q ? filterRecentFiles(q).slice(0, 6) : recommendedFiles.value
})

const shownRecentFiles = computed(() => {
  const q = searchQuery.value.trim()
  return q ? filterRecentFiles(q) : allRecentFiles.value
})

const shownCategories = computed(() => {
  const q = queryLower.value
  const blocks: { name: string; entries: AppEntry[] }[] = []
  for (const cat of categoryKeysSorted.value) {
    const raw = appsByCategory.value.get(cat) || []
    const entries = q ? raw.filter(matchesQuery) : raw
    if (entries.length) blocks.push({ name: cat, entries })
  }
  return blocks
})

function localizeCategoryName(name: string) {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')

  if (normalized === 'system-tools') {
    return t('win11.start.categories.systemTools')
  }
  if (normalized === 'other') {
    return t('win11.start.categories.other')
  }
  return name
}

/** Flat A–Z list for grid and list views. */
const shownFlatApps = computed(() => {
  const list = alphabeticalApps.value
  return queryLower.value ? list.filter(matchesQuery) : list
})

const allAppsViewOptions = computed(() => [
  { label: t('win11.start.viewCategory'), value: 'category' as const },
  { label: t('win11.start.viewGrid'), value: 'grid' as const },
  { label: t('win11.start.viewList'), value: 'list' as const },
])

/** While searching, always show list-style matches (ignore view toggle). */
const effectiveAllAppsView = computed(() =>
  queryLower.value ? 'list' : allAppsView.value,
)

watch(
  shownPinned,
  (next) => {
    if (draggingPinned.value || queryLower.value) return
    pinnedDragList.value = [...next]
  },
  { deep: true, immediate: true },
)

function pinnedItemKey(el: AppEntry) {
  return entryStorageKey(el)
}

function onPinnedDragStart() {
  draggingPinned.value = true
}

function onPinnedDragEnd() {
  applyPinnedOrder(pinnedDragList.value)
  suppressBackdropUntil = Date.now() + 220
  requestAnimationFrame(() => {
    draggingPinned.value = false
  })
}

const currentViewLabel = computed(
  () =>
    allAppsViewOptions.value.find((o) => o.value === allAppsView.value)?.label ??
    '',
)

function closeViewPicker() {
  if (!viewPickerOpen.value) return
  viewPickerOpen.value = false
  suppressCloseForSelectUntil = Date.now() + 200
}

function toggleViewPicker() {
  viewPickerOpen.value = !viewPickerOpen.value
  if (!viewPickerOpen.value) {
    suppressCloseForSelectUntil = Date.now() + 200
  }
}

function selectView(value: Win11AllAppsView) {
  allAppsView.value = value
  closeViewPicker()
}

function isViewSelectDismissGuarded() {
  return viewPickerOpen.value || Date.now() < suppressCloseForSelectUntil
}

function tryCloseStartMenu() {
  closeCtxMenu()
  if (draggingPinned.value) return
  if (Date.now() < suppressBackdropUntil) return
  emit('close')
}

function onBackdropClick() {
  tryCloseStartMenu()
}

onClickOutside(
  startDialog,
  () => {
    if (!props.open) return
    if (isViewSelectDismissGuarded()) return
    tryCloseStartMenu()
  },
  {
    ignore: ['.win11-dock__icon--start'],
  },
)

onClickOutside(
  ctxMenuEl,
  () => {
    if (!ctxMenu.value) return
    closeCtxMenu()
  },
)

onClickOutside(
  viewDropdownEl,
  () => {
    if (!viewPickerOpen.value) return
    closeViewPicker()
  },
)

const { escape } = useMagicKeys({ target: startDialog })

whenever(escape, () => {
  if (!props.open) return
  if (ctxMenu.value) {
    closeCtxMenu()
    return
  }
  if (viewPickerOpen.value) {
    closeViewPicker()
    return
  }
  emit('close')
})

function openAllApps() {
  document.getElementById('win11-all-heading')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function openRecentSection() {
  document.getElementById('win11-recent-heading')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function recentFileSubtitle(entry: { openedAt: number; size?: number }) {
  const date = formatRecentFileDate(entry.openedAt)
  const size = formatRecentFileSize(entry.size)
  return [date, size].filter(Boolean).join(' · ')
}

function onSelectApp(entry: AppEntry) {
  launchEntry(entry)
  emit('close')
}

async function onSelectRecentFile(entry: { path: string; openedAt: number; size?: number }) {
  await openRecentFile(entry)
  emit('close')
}
</script>

<template>
  <Transition name="win11-start-fade">
    <div
      v-if="open"
      class="win11-start-layer"
      role="presentation"
    >
      <div
        class="win11-start-backdrop"
        @click="onBackdropClick"
      />
      <div
        id="win11-start-dialog"
        ref="startDialog"
        class="win11-start"
        role="dialog"
        :aria-label="t('win11.start.ariaLabel')"
      >
        <div class="win11-start__search-container">
          <div class="win11-start__search">
          <span class="win11-start__search-icon" aria-hidden="true" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="search"
            class="win11-start__search-input"
            :placeholder="t('win11.start.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        </div>

        <div ref="scrollRoot" class="win11-start__scroll">
          <section
            v-if="!queryLower || shownPinned.length"
            class="win11-start__block"
            aria-labelledby="win11-pinned-heading"
          >
            <div class="win11-start__section-head">
              <h2 id="win11-pinned-heading" class="win11-start__heading">
                {{ t('win11.start.pinned') }}
              </h2>
              <button
                v-if="!queryLower && pinnedEntries.length"
                type="button"
                class="win11-start__show-all"
                @click="openAllApps"
              >
                {{ t('win11.start.showAll') }}
              </button>
            </div>
            <draggable
              v-if="!queryLower && shownPinned.length"
              v-model="pinnedDragList"
              tag="ul"
              class="win11-start__grid"
              :item-key="pinnedItemKey"
              :animation="200"
              ghost-class="win11-start__tile--ghost"
              chosen-class="win11-start__tile--chosen"
              drag-class="win11-start__tile--dragging"
              :delay-on-touch-only="true"
              :touch-start-threshold="8"
              @start="onPinnedDragStart"
              @end="onPinnedDragEnd"
            >
              <template #item="{ element }">
                <li data-draggable>
                  <div
                    class="win11-start__tile-wrap"
                    @contextmenu="openPinnedCtx($event, element)"
                  >
                    <button
                      type="button"
                      class="win11-start__tile"
                      @click="onSelectApp(element)"
                    >
                      <span class="win11-start__tile-icon">
                        <img
                          v-if="
                            element.icon &&
                            (element.icon.startsWith('http') ||
                              element.icon.startsWith('data:'))
                          "
                          :src="element.icon"
                          alt=""
                        />
                        <Icon
                          v-else-if="element.icon"
                          :name="element.icon"
                          size="28"
                        />
                        <span
                          v-else
                          class="win11-start__tile-fallback"
                          aria-hidden="true"
                        />
                      </span>
                      <span class="win11-start__tile-label">{{
                        element.title
                      }}</span>
                    </button>
                  </div>
                </li>
              </template>
            </draggable>
            <ul
              v-else-if="queryLower && shownPinned.length"
              class="win11-start__grid win11-start__grid--static"
            >
              <li
                v-for="entry in shownPinned"
                :key="entryStorageKey(entry)"
              >
                <div
                  class="win11-start__tile-wrap"
                  @contextmenu="openPinnedCtx($event, entry)"
                >
                  <button
                    type="button"
                    class="win11-start__tile"
                    @click="onSelectApp(entry)"
                  >
                    <span class="win11-start__tile-icon">
                      <img
                        v-if="
                          entry.icon &&
                          (entry.icon.startsWith('http') ||
                            entry.icon.startsWith('data:'))
                        "
                        :src="entry.icon"
                        alt=""
                      />
                      <Icon
                        v-else-if="entry.icon"
                        :name="entry.icon"
                        size="28"
                      />
                      <span
                        v-else
                        class="win11-start__tile-fallback"
                        aria-hidden="true"
                      />
                    </span>
                    <span class="win11-start__tile-label">{{
                      entry.title
                    }}</span>
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <section
            v-if="shownRecommendedFiles.length"
            class="win11-start__block"
            aria-labelledby="win11-rec-heading"
          >
            <div class="win11-start__section-head">
              <h2 id="win11-rec-heading" class="win11-start__heading">
                {{ t('win11.start.recommended') }}
              </h2>
              <button
                v-if="!queryLower && allRecentFiles.length > shownRecommendedFiles.length"
                type="button"
                class="win11-start__show-all"
                @click="openRecentSection"
              >
                {{ t('win11.start.showAll') }}
              </button>
            </div>
            <ul
              class="win11-start__list win11-start__list--rec-cols"
            >
              <li
                v-for="entry in shownRecommendedFiles"
                :key="entry.path"
              >
                <button
                  type="button"
                  class="win11-start__row win11-start__row--file"
                  @click="onSelectRecentFile(entry)"
                >
                  <span class="win11-start__row-icon">
                    <Icon :name="recentFileIcon(entry.extension)" size="22" />
                  </span>
                  <span class="win11-start__row-text">
                    <span class="win11-start__row-title">{{ entry.name }}</span>
                    <span class="win11-start__row-meta">{{
                      recentFileSubtitle(entry)
                    }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section
            v-if="shownRecentFiles.length && !queryLower"
            class="win11-start__block"
            aria-labelledby="win11-recent-heading"
          >
            <div class="win11-start__section-head">
              <h2 id="win11-recent-heading" class="win11-start__heading">
                {{ t('win11.start.recent') }}
              </h2>
            </div>
            <ul class="win11-start__list win11-start__list--rec-cols">
              <li
                v-for="entry in shownRecentFiles"
                :key="`all-${entry.path}`"
              >
                <button
                  type="button"
                  class="win11-start__row win11-start__row--file"
                  @click="onSelectRecentFile(entry)"
                >
                  <span class="win11-start__row-icon">
                    <Icon :name="recentFileIcon(entry.extension)" size="22" />
                  </span>
                  <span class="win11-start__row-text">
                    <span class="win11-start__row-title">{{ entry.name }}</span>
                    <span class="win11-start__row-meta">{{
                      recentFileSubtitle(entry)
                    }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section
            class="win11-start__block"
            aria-labelledby="win11-all-heading"
          >
            <div class="win11-start__section-head win11-start__section-head--all">
              <h2 id="win11-all-heading" class="win11-start__heading">
                {{ t('win11.start.allApps') }}
              </h2>
              <div
                v-if="!queryLower"
                ref="viewDropdownEl"
                class="win11-start__view-picker"
              >
                <button
                  type="button"
                  class="win11-start__view-trigger"
                  :aria-expanded="viewPickerOpen"
                  aria-haspopup="listbox"
                  :aria-label="t('win11.start.viewAria')"
                  @click.stop="toggleViewPicker"
                >
                  <span class="win11-start__view-trigger-text">
                    <span class="win11-start__view-prefix">{{
                      t('win11.start.viewPrefix')
                    }}</span>
                    <span class="win11-start__view-value">{{
                      currentViewLabel
                    }}</span>
                  </span>
                  <span class="win11-start__view-chevron" aria-hidden="true" />
                </button>
                  <ul
                    v-if="viewPickerOpen"
                    class="win11-start__view-panel"
                    role="listbox"
                    :aria-label="t('win11.start.viewAria')"
                    @click.stop
                  >
                    <li
                      v-for="opt in allAppsViewOptions"
                      :key="opt.value"
                      role="presentation"
                    >
                      <button
                        type="button"
                        class="win11-start__view-option"
                        role="option"
                        :aria-selected="allAppsView === opt.value"
                        @click="selectView(opt.value)"
                      >
                        {{ opt.label }}
                      </button>
                    </li>
                  </ul>
              </div>
            </div>

            <template v-if="effectiveAllAppsView === 'category'">
              <div class="win11-start__category-board">
                <article
                  v-for="block in shownCategories"
                  :key="block.name"
                  class="win11-start__cat-card"
                >
                  <div class="win11-start__cat-card-icons">
                    <button
                      v-for="entry in block.entries.slice(0, 4)"
                      :key="entryStorageKey(entry)"
                      type="button"
                      class="win11-start__cat-mini"
                      :title="entry.title"
                      @click="onSelectApp(entry)"
                      @contextmenu="openListCtx($event, entry)"
                    >
                      <img
                        v-if="entry.icon && entry.icon.startsWith('http')"
                        class="win11-start__cat-mini-img"
                        :src="entry.icon"
                        alt=""
                      />
                      <Icon
                        v-else-if="entry.icon"
                        :name="entry.icon"
                        size="24"
                      />
                      <span
                        v-else
                        class="win11-start__tile-fallback win11-start__tile-fallback--sm"
                      />
                    </button>
                  </div>
                  <h3 class="win11-start__cat-card-title">
                    {{ localizeCategoryName(block.name) }}
                  </h3>
                </article>
              </div>
            </template>

            <ul
              v-else-if="effectiveAllAppsView === 'grid'"
              class="win11-start__grid win11-start__grid--all"
            >
              <li
                v-for="entry in shownFlatApps"
                :key="entryStorageKey(entry)"
              >
                <div
                  class="win11-start__tile-wrap win11-start__tile-wrap--all-grid"
                  @contextmenu="openListCtx($event, entry)"
                >
                  <button
                    type="button"
                    class="win11-start__tile win11-start__tile--all-grid"
                    @click="onSelectApp(entry)"
                  >
                    <span class="win11-start__tile-icon win11-start__tile-icon--sm">
                      <img
                        v-if="
                          entry.icon &&
                          (entry.icon.startsWith('http') ||
                            entry.icon.startsWith('data:'))
                        "
                        :src="entry.icon"
                        alt=""
                      />
                      <Icon
                        v-else-if="entry.icon"
                        :name="entry.icon"
                        size="24"
                      />
                      <span
                        v-else
                        class="win11-start__tile-fallback"
                        aria-hidden="true"
                      />
                    </span>
                    <span class="win11-start__tile-label">{{
                      entry.title
                    }}</span>
                  </button>
                </div>
              </li>
            </ul>

            <ul v-else class="win11-start__list win11-start__list--all-apps">
              <li
                v-for="entry in shownFlatApps"
                :key="entryStorageKey(entry)"
              >
                <div
                  class="win11-start__row-wrap"
                  @contextmenu="openListCtx($event, entry)"
                >
                  <button
                    type="button"
                    class="win11-start__row"
                    @click="onSelectApp(entry)"
                  >
                    <span class="win11-start__row-icon">
                      <img
                        v-if="entry.icon && entry.icon.startsWith('http')"
                        :src="entry.icon"
                        alt=""
                      />
                      <Icon
                        v-else-if="entry.icon"
                        :name="entry.icon"
                        size="22"
                      />
                      <span
                        v-else
                        class="win11-start__tile-fallback win11-start__tile-fallback--sm"
                      />
                    </span>
                    <span class="win11-start__row-title">{{ entry.title }}</span>
                  </button>
                </div>
              </li>
            </ul>

            <p
              v-if="!apps.length"
              class="win11-start__empty"
            >
              {{ t('systemBar.applicationList.empty') }}
            </p>
            <p
              v-else-if="queryLower && !shownCategories.length && !shownRecommendedFiles.length"
              class="win11-start__empty"
            >
              {{ t('win11.start.noResults') }}
            </p>
          </section>
        </div>


        <div class="win11-start__footer-container">
          <footer class="win11-start__footer">
          <div class="win11-start__user">
            <div
              class="win11-start__avatar"
              aria-hidden="true"
            >
              <img
                v-if="shellAvatarUrl"
                class="win11-start__avatar-img"
                :src="shellAvatarUrl"
                alt=""
              />
              <Icon
                v-else
                name="mdi:account-circle"
                size="36"
                class="win11-start__avatar-placeholder"
              />
            </div>
            <div class="win11-start__user-meta">
              <span class="win11-start__user-name">{{ shellDisplayName }}</span>
            </div>
          </div>
          <button
            type="button"
            class="win11-start__power win11-start__power--trailing"
            :aria-label="t('win11.start.powerOff')"
            :title="t('win11.start.powerOff')"
            @click="powerOff()"
          >
            <span class="win11-start__power-icon" aria-hidden="true" />
            <span class="sr-only">{{ t('win11.start.powerOff') }}</span>
          </button>
        </footer>
        </div>
      </div>

      <Teleport to="body">
        <ul
          v-if="open && ctxMenu"
          ref="ctxMenuEl"
          class="win11-start-ctx"
          role="menu"
          :aria-label="t('win11.start.context.menuLabel')"
          :style="ctxMenuStyle"
          @click.stop
        >
          <template v-if="ctxMenu.variant === 'pinned'">
            <li role="none">
              <button
                type="button"
                class="win11-start-ctx__item"
                role="menuitem"
                :disabled="!canMovePinnedLeft(ctxMenu.entry)"
                @click="applyCtxMoveLeft"
              >
                {{ t('win11.start.context.moveLeft') }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="win11-start-ctx__item"
                role="menuitem"
                :disabled="!canMovePinnedRight(ctxMenu.entry)"
                @click="applyCtxMoveRight"
              >
                {{ t('win11.start.context.moveRight') }}
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                class="win11-start-ctx__item"
                role="menuitem"
                @click="applyCtxMoveToFront"
              >
                {{ t('win11.start.context.moveToFront') }}
              </button>
            </li>
            <li role="separator" class="win11-start-ctx__sep" aria-hidden="true" />
            <li role="none">
              <button
                type="button"
                class="win11-start-ctx__item win11-start-ctx__item--danger"
                role="menuitem"
                @click="applyCtxUnpinFromPinned"
              >
                {{ t('win11.start.context.unpinFromStart') }}
              </button>
            </li>
          </template>
          <template v-else>
            <li v-if="!isPinned(ctxMenu.entry)" role="none">
              <button
                type="button"
                class="win11-start-ctx__item"
                role="menuitem"
                @click="applyCtxPinFromList"
              >
                {{ t('win11.start.pinToStart') }}
              </button>
            </li>
            <li v-else role="none">
              <button
                type="button"
                class="win11-start-ctx__item win11-start-ctx__item--danger"
                role="menuitem"
                @click="applyCtxUnpinFromList"
              >
                {{ t('win11.start.context.unpinFromStart') }}
              </button>
            </li>
          </template>
        </ul>
      </Teleport>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.win11-start-layer {
  position: fixed;
  inset: 0;
  z-index: 199990;
  pointer-events: none;
}

.win11-start-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.18);
}

.win11-start {
  position: fixed;
  left: 50%;
  bottom: calc(48px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  pointer-events: auto;
  z-index: 199995;
  width: min(652px, calc(100vw - 24px));
  max-height: min(740px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: var(--win11-shell-surface, rgba(44, 44, 44, 0.82));
  backdrop-filter: blur(40px) saturate(1.35);
  -webkit-backdrop-filter: blur(40px) saturate(1.35);
  border: 1px solid color-mix(in srgb, var(--win11-shell-border, rgba(255, 255, 255, 0.08)) 90%, transparent);
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.45),
    0 0 1px rgba(0, 0, 0, 0.6);
  color: var(--win11-shell-text, #fff);
  font-family:
    'Segoe UI Variable',
    'Segoe UI',
    system-ui,
    sans-serif;
  --win11-start-chrome-bg: rgba(0, 0, 0, 0.38);
}

.win11-start__search-container,
.win11-start__footer-container {
  flex-shrink: 0;
  background: var(--win11-start-chrome-bg);
}

.win11-start__search,
.win11-start__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  min-height: 44px;
}

.win11-start__footer {
  justify-content: space-between;
}

.win11-start__search-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.win11-start__search-input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}

.win11-start__search-input::placeholder {
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.45));
}

.win11-start__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 4px;
}

.win11-start__block {
  padding: 0 12px 12px;
}

.win11-start__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.win11-start__heading {
  margin: 8px 4px 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--win11-shell-text, #fff) 78%, transparent);
}

.win11-start__section-head .win11-start__heading {
  margin-bottom: 10px;
}

.win11-start__show-all {
  flex-shrink: 0;
  padding: 4px 8px;
  margin-bottom: 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: color-mix(in srgb, var(--win11-shell-text, #fff) 84%, transparent);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.win11-start__show-all:hover {
  background: rgba(255, 255, 255, 0.06);
}

.win11-start__hint {
  margin: 0 4px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.45));
}

.win11-start__section-head--all {
  align-items: center;
}

.win11-start__section-head--all .win11-start__heading {
  margin-right: auto;
  margin-bottom: 8px;
}

.win11-start__view-picker {
  position: relative;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.win11-start__view-trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  margin: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--win11-shell-text, rgba(255, 255, 255, 0.92));
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
}

.win11-start__view-trigger:hover {
  background: rgba(255, 255, 255, 0.06);
}

.win11-start__view-trigger:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.28);
  outline-offset: 1px;
}

.win11-start__view-trigger-text {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.win11-start__view-prefix {
  font-weight: 500;
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.55));
}

.win11-start__view-value {
  font-weight: 600;
  color: color-mix(in srgb, var(--win11-shell-text, #fff) 88%, transparent);
}

.win11-start__view-chevron {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  margin-left: 1px;
  opacity: 0.65;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.win11-start__view-panel {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 20;
  min-width: 100%;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(32, 32, 32, 0.98);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.win11-start__view-option {
  display: block;
  width: calc(100% - 8px);
  margin: 0 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.win11-start__view-option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.win11-start__view-option[aria-selected='true'] {
  background: rgba(255, 255, 255, 0.14);
}

.win11-start__list--rec-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}

.win11-start__category-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 4px;
}

.win11-start__cat-card {
  border-radius: 10px;
  padding: 12px 10px 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.win11-start__cat-card-icons {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  min-height: 76px;
}

.win11-start__cat-mini {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  color: inherit;
  cursor: pointer;
  transition: background 0.12s ease;
}

.win11-start__cat-mini:hover {
  background: rgba(255, 255, 255, 0.1);
}

.win11-start__cat-mini-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.win11-start__cat-card-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
}

.win11-start__grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.win11-start__grid--all {
  margin-top: 4px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px 4px;
}

.win11-start__tile-wrap--all-grid {
  position: relative;
}

.win11-start__tile--all-grid {
  padding: 8px 4px;
  min-height: 72px;
}

.win11-start__tile-icon--sm {
  width: 36px;
  height: 36px;
}

.win11-start__tile-icon--sm img {
  width: 26px;
  height: 26px;
}

@media (max-width: 520px) {
  .win11-start__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .win11-start__category-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 380px) {
  .win11-start__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 440px) {
  .win11-start__list--rec-cols {
    grid-template-columns: 1fr;
  }
}

.win11-start__tile-wrap {
  position: relative;
}

.win11-start__tile {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background 0.12s ease;
}

.win11-start__tile:hover {
  background: rgba(255, 255, 255, 0.06);
}

.win11-start__tile:active {
  background: rgba(255, 255, 255, 0.1);
}

.win11-start__tile--ghost {
  opacity: 0.45;
}

.win11-start__tile--chosen .win11-start__tile {
  background: rgba(255, 255, 255, 0.08);
}

.sortable-drag.win11-start__tile--dragging .win11-start__tile {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.win11-start__tile-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: transparent;
}

.win11-start__tile-icon img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.win11-start__tile-fallback {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: linear-gradient(135deg, #8a8a8a, #5f5f5f);
}

.win11-start__tile-fallback--sm {
  width: 22px;
  height: 22px;
}

.win11-start__tile-label {
  font-size: 11px;
  text-align: center;
  line-height: 1.25;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.win11-start__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.win11-start__row-wrap {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.win11-start__row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.win11-start__row:hover {
  background: rgba(255, 255, 255, 0.06);
}

.win11-start__row-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win11-start__row-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.win11-start__row--file {
  width: 100%;
}

.win11-start__row-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.win11-start__row-meta {
  font-size: 11px;
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.45));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.win11-start__category {
  margin-bottom: 12px;
}

.win11-start__category-title {
  margin: 0 4px 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.win11-start__empty {
  padding: 16px 12px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}


.win11-start__user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.win11-start__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.win11-start__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.win11-start__avatar-placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.win11-start__user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.win11-start__user-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.win11-start__power {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.win11-start__power--trailing {
  padding: 8px;
  border-radius: 4px;
}

.win11-start__power:hover {
  background: rgba(255, 255, 255, 0.06);
}

.win11-start__power-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  position: relative;
}

.win11-start__power-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 3px;
  transform: translateX(-50%);
  width: 2px;
  height: 6px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 1px;
}

.win11-start-fade-enter-active,
.win11-start-fade-leave-active {
  transition: opacity 0.18s ease;
}

.win11-start-fade-enter-active .win11-start,
.win11-start-fade-leave-active .win11-start {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.win11-start-fade-enter-from,
.win11-start-fade-leave-to {
  opacity: 0;
}

.win11-start-fade-enter-from .win11-start,
.win11-start-fade-leave-to .win11-start {
  transform: translate(-50%, 8px);
  opacity: 0;
}

.win11-start-ctx-scrim {
  position: fixed;
  inset: 0;
  z-index: 200049;
  pointer-events: auto;
}

.win11-start-ctx {
  position: fixed;
  margin: 0;
  padding: 4px 0;
  min-width: 220px;
  list-style: none;
  border-radius: 8px;
  background: rgba(44, 44, 44, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.45),
    0 0 1px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  color: #fff;
}

.win11-start-ctx__item {
  display: block;
  width: 100%;
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.win11-start-ctx__item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.win11-start-ctx__item:disabled {
  opacity: 0.38;
  cursor: default;
}

.win11-start-ctx__item--danger {
  color: #ffb4ab;
}

.win11-start-ctx__sep {
  height: 1px;
  margin: 4px 10px;
  background: rgba(255, 255, 255, 0.12);
  list-style: none;
}
</style>
