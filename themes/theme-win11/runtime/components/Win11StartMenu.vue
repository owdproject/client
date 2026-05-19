<script setup lang="ts">
import draggable from 'vuedraggable'
import Select from 'primevue/select'
import { useWin11StartMenu, entryStorageKey } from '../composables/useWin11StartMenu'
import { useI18n } from 'vue-i18n'
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
} from 'vue'
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
  recommendedEntries,
  appsByCategory,
  categoryKeysSorted,
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
  terminalShortcut,
  authShortcut,
  openDocumentsFolder,
  powerOff,
  execAuth,
  launchTerminal,
} = useWin11StartMenu()

const appsList = apps
type AppEntry = UnwrapRef<typeof appsList>[number]

const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const scrollRoot = ref<HTMLElement | null>(null)
const pinnedDragList = ref<AppEntry[]>([])
const draggingPinned = ref(false)
let suppressBackdropUntil = 0

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

const shownRecommended = computed(() =>
  recommendedEntries.value.filter(matchesQuery),
)

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

/** Flat list for “All apps” grid view (title order). */
const shownFlatApps = computed(() => {
  const list = [...apps.value].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', undefined, {
      sensitivity: 'base',
    }),
  )
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

function onBackdropClick() {
  closeCtxMenu()
  if (draggingPinned.value) return
  if (Date.now() < suppressBackdropUntil) return
  emit('close')
}

function openAllApps() {
  allAppsView.value = 'list'
  document.getElementById('win11-all-heading')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function onSelectApp(entry: AppEntry) {
  launchEntry(entry)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (ctxMenu.value) {
      e.preventDefault()
      closeCtxMenu()
      return
    }
    emit('close')
  }
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
        class="win11-start"
        role="dialog"
        :aria-label="t('win11.start.ariaLabel')"
        @keydown="onKeydown"
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
            <p
              v-if="!queryLower && pinnedEntries.length === 0"
              class="win11-start__hint"
            >
              {{ t('win11.start.pinnedHint') }}
            </p>
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
            v-if="shownRecommended.length"
            class="win11-start__block"
            aria-labelledby="win11-rec-heading"
          >
            <div class="win11-start__section-head">
              <h2 id="win11-rec-heading" class="win11-start__heading">
                {{ t('win11.start.recommended') }}
              </h2>
              <button
                v-if="!queryLower"
                type="button"
                class="win11-start__show-all"
                @click="openAllApps"
              >
                {{ t('win11.start.showAll') }}
              </button>
            </div>
            <ul
              v-if="!queryLower"
              class="win11-start__list win11-start__list--rec-cols"
            >
              <li
                v-for="entry in shownRecommended"
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
            <ul
              v-else
              class="win11-start__list"
            >
              <li
                v-for="entry in shownRecommended"
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
                class="win11-start__view-picker"
              >
                <span class="win11-start__view-prefix">{{ t('win11.start.viewPrefix') }}</span>
                <Select
                  v-model="allAppsView"
                  :options="allAppsViewOptions"
                  option-label="label"
                  option-value="value"
                  class="win11-start__view-select"
                  overlay-class="win11-start__view-panel"
                  :aria-label="t('win11.start.viewAria')"
                />
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

            <template v-else>
              <div
                v-for="block in shownCategories"
                :key="block.name"
                class="win11-start__category"
              >
                <h3 class="win11-start__category-title">
                  {{ localizeCategoryName(block.name) }}
                </h3>
                <ul class="win11-start__list">
                  <li
                    v-for="entry in block.entries"
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
                        <span class="win11-start__row-title">{{
                          entry.title
                        }}</span>
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            </template>

            <p
              v-if="!apps.length"
              class="win11-start__empty"
            >
              {{ t('systemBar.applicationList.empty') }}
            </p>
            <p
              v-else-if="queryLower && !shownCategories.length"
              class="win11-start__empty"
            >
              {{ t('win11.start.noResults') }}
            </p>
          </section>
        </div>

        <section
          class="win11-start__quick"
          :aria-label="t('win11.start.quickLinks')"
        >
          <button
            v-if="terminalShortcut"
            type="button"
            class="win11-start__link"
            @click="launchTerminal(); emit('close')"
          >
            {{ t('win11.start.runTerminal') }}
          </button>
          <button
            v-if="authShortcut"
            type="button"
            class="win11-start__link"
            @click="execAuth(); emit('close')"
          >
            {{ t('win11.start.account') }}
          </button>
          <button
            type="button"
            class="win11-start__link"
            @click="openDocumentsFolder(); emit('close')"
          >
            {{ t('win11.start.documents') }}
          </button>
        </section>

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

      <Teleport to="body">
        <div
          v-if="open && ctxMenu"
          class="win11-start-ctx-scrim"
          aria-hidden="true"
          @click="closeCtxMenu"
          @contextmenu.prevent="closeCtxMenu"
        />
        <ul
          v-if="open && ctxMenu"
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
  width: min(580px, calc(100vw - 24px));
  max-height: min(680px, calc(100vh - 96px));
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
}

.win11-start__search-container {
  background: rgba(0, 0, 0, 0.2);
}

.win11-start__search {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 12px 8px;
  padding: 8px 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  align-items: flex-end;
  flex-wrap: wrap;
}

.win11-start__section-head--all .win11-start__heading {
  margin-right: auto;
}

.win11-start__view-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.win11-start__view-prefix {
  font-size: 12px;
  font-weight: 500;
  color: var(--win11-shell-muted, rgba(255, 255, 255, 0.55));
  white-space: nowrap;
}

.win11-start__view-select {
  min-width: 140px;
}

.win11-start__view-select {
  height: 30px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.07);
  color: var(--win11-shell-text, rgba(255, 255, 255, 0.92));
  font-size: 12px;
  box-shadow: none;
}

.win11-start__view-select:hover {
  background: rgba(255, 255, 255, 0.11);
  border-color: rgba(255, 255, 255, 0.2);
}

.win11-start__view-select:focus-within {
  border-color: rgba(255, 255, 255, 0.26);
}

.win11-start__view-select :deep(.p-select-label) {
  padding: 0 10px;
  line-height: 28px;
  color: inherit;
}

.win11-start__view-select :deep(.p-select-dropdown) {
  width: 24px;
  color: color-mix(in srgb, var(--win11-shell-text, #fff) 78%, transparent);
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
  background: rgba(255, 255, 255, 0.06);
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

.win11-start__quick {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.win11-start__link {
  padding: 6px 12px;
  border-radius: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.win11-start__link:hover {
  background: rgba(255, 255, 255, 0.1);
}

.win11-start__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
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

<style lang="scss">
.win11-start__view-panel.p-select-overlay {
  z-index: 200100 !important;
  padding: 4px 0;
  border-radius: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  background: rgba(32, 32, 32, 0.98) !important;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45) !important;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.win11-start__view-panel .p-select-list {
  padding: 0;
}

.win11-start__view-panel .p-select-option {
  margin: 0 4px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.win11-start__view-panel .p-select-option:not(.p-select-option-selected):hover {
  background: rgba(255, 255, 255, 0.08);
}

.win11-start__view-panel .p-select-option.p-select-option-selected {
  background: rgba(255, 255, 255, 0.14);
}
</style>
