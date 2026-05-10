<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { useDesktopExplorerStore } from '@owdproject/core/runtime/stores/storeDesktopExplorer'
import { useRuntimeConfig } from 'nuxt/app'
import { computed, nextTick, onMounted, ref } from 'vue'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import draggable from 'vuedraggable'
import ContextMenu from 'primevue/contextmenu'
import type { MenuItem } from 'primevue/menuitem'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  window: IWindowController
  fsExplorer: NonNullable<IWindowController['fsExplorer']>
}>()

type ExplorerNavFolder = {
  id: string
  label: string
  path: string
  icon?: string
}

const { t } = useI18n()
const desktopExplorerStore = useDesktopExplorerStore()
const runtimeConfig = useRuntimeConfig()
const selectedTreeKey = ref<string>('')

/** Right‑click → Pin / Unpin on shell folder rows (Desktop, Documents, …). */
const shellFolderCtxMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const shellFolderCtxTarget = ref<ExplorerNavFolder | null>(null)

const explorerOverlayPt = {
  root: { class: 'win11-explorer-popup-menu' },
}

const explorerConfig = computed(
  () => runtimeConfig.public.desktop.explorer ?? {},
)

function normalizeFolderList(list: unknown): ExplorerNavFolder[] {
  if (!Array.isArray(list)) return []

  return list
    .map((item): ExplorerNavFolder | null => {
      if (!item || typeof item !== 'object') return null

      const entry = item as Record<string, unknown>
      const id = String(entry.id ?? '').trim()
      const label = String(entry.label ?? '').trim()
      const rawPath = String(entry.path ?? '').trim()
      const icon = String(entry.icon ?? '').trim()

      if (!id || !label || !rawPath) return null

      return {
        id,
        label,
        path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
        icon: icon || undefined,
      }
    })
    .filter((entry): entry is ExplorerNavFolder => Boolean(entry))
}

function resolveFolderConfig(
  base: unknown,
  extra: unknown,
  override: unknown,
): ExplorerNavFolder[] {
  const normalizedOverride = normalizeFolderList(override)
  const source = normalizedOverride.length > 0
    ? normalizedOverride
    : [...normalizeFolderList(base), ...normalizeFolderList(extra)]

  const byId = new Map<string, ExplorerNavFolder>()
  for (const entry of source) byId.set(entry.id, entry)
  return [...byId.values()]
}

const specialFolders = computed(() =>
  resolveFolderConfig(
    explorerConfig.value.specialFolders,
    explorerConfig.value.specialFoldersExtra,
    explorerConfig.value.specialFoldersOverride,
  ),
)

const quickAccessSeed = computed(() =>
  resolveFolderConfig(
    explorerConfig.value.quickAccess,
    explorerConfig.value.quickAccessExtra,
    explorerConfig.value.quickAccessOverride,
  ),
)

/** ZenFS mount points → “drives” under This PC (Dropbox etc. appear when added to `desktop.fs.mounts`). */
const fsMounts = computed(() => {
  const raw = runtimeConfig.public.desktop.fs?.mounts
  if (!raw || typeof raw !== 'object') return {} as Record<string, unknown>
  return raw as Record<string, unknown>
})

const explorerMountLabels = computed(
  () => explorerConfig.value.mountLabels ?? {},
)

function isHiddenMountPoint(path: string): boolean {
  if (path === '/') return false
  if (!path.startsWith('/')) return false
  const segments = path.split('/').filter(Boolean)
  const head = segments[0]
  return Boolean(head?.startsWith('.'))
}

function fallbackMountLabel(mountPath: string): string {
  const segments = mountPath.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last) return mountPath
  return last.charAt(0).toUpperCase() + last.slice(1)
}

const volumeEntries = computed(() =>
  Object.keys(fsMounts.value)
    .filter((p) => !isHiddenMountPoint(p))
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      path,
      label:
        explorerMountLabels.value[path] ?? fallbackMountLabel(path),
      icon: 'mdi:harddisk' as const,
    })),
)

onMounted(() => {
  if (desktopExplorerStore.quickAccessPins.length === 0) {
    desktopExplorerStore.setQuickAccessPins(quickAccessSeed.value)
  }
})

const quickAccessPinsModel = computed({
  get() {
    return desktopExplorerStore.quickAccessPins
  },
  set(value: ExplorerNavFolder[]) {
    desktopExplorerStore.setQuickAccessPins(value)
  },
})

const expandedKeys = computed<Record<string, boolean>>({
  get() {
    return Object.fromEntries(
      desktopExplorerStore.navExpandedKeys.map((key) => [key, true]),
    )
  },
  set(value) {
    desktopExplorerStore.setNavExpandedKeys(
      Object.entries(value)
        .filter(([, expanded]) => expanded)
        .map(([key]) => key),
    )
  },
})

const treeNodes = computed<TreeNode[]>(() => [
  {
    key: 'thisPc',
    label: 'This PC',
    icon: 'mdi:monitor',
    selectable: false,
    children: volumeEntries.value.map((v) => ({
      key: `vol:${v.path}`,
      label: v.label,
      icon: v.icon,
      data: {
        path: v.path,
      },
      leaf: true,
    })),
  },
])

async function go(path: string) {
  const target = path.startsWith('/') ? path : `/${path}`
  props.fsExplorer.basePath.value = target
  props.fsExplorer.fsDirectoryNavigation.push(target)
  await props.fsExplorer.navigateToDirectory(target)
}

async function onNodeSelect(event: { node?: TreeNode }) {
  const path = event.node?.data?.path
  if (typeof path !== 'string') return
  selectedTreeKey.value = String(event.node?.key ?? '')
  await go(path)
}

function isPinned(path: string) {
  return desktopExplorerStore.quickAccessPins.some((entry) => entry.path === path)
}

function pinFromSpecial(entry: ExplorerNavFolder) {
  desktopExplorerStore.pinQuickAccess(entry)
}

function pinVolumeFromTree(node: TreeNode) {
  const path = node.data?.path
  if (typeof path !== 'string') return
  pinFromSpecial({
    id: `pin:${path}`,
    label: String(node.label ?? path),
    path,
    icon: typeof node.icon === 'string' ? node.icon : 'mdi:harddisk',
  })
}

function unpin(path: string) {
  desktopExplorerStore.unpinQuickAccess(path)
}

const shellFolderMenuItems = computed<MenuItem[]>(() => {
  const entry = shellFolderCtxTarget.value
  if (!entry) return []

  const pinRow: MenuItem = isPinned(entry.path)
    ? {
        label: t('apps.explorer.nav.unpinFromQuickAccess'),
        icon: 'pi pi-times',
        command: () => unpin(entry.path),
      }
    : {
        label: t('apps.explorer.nav.pinToQuickAccess'),
        icon: 'pi pi-thumbtack',
        command: () => pinFromSpecial(entry),
      }

  return [
    {
      label: t('apps.explorer.nav.openFolder'),
      icon: 'pi pi-folder-open',
      command: () => void go(entry.path),
    },
    { separator: true },
    pinRow,
  ]
})

async function onShellFolderContextMenu(entry: ExplorerNavFolder, event: MouseEvent) {
  event.preventDefault()
  shellFolderCtxTarget.value = entry
  await nextTick()
  shellFolderCtxMenu.value?.show(event)
}

const hasPinnedFolders = computed(() => quickAccessPinsModel.value.length > 0)

const showBorderBeforeShellFolders = computed(() => hasPinnedFolders.value)

const showBorderBeforeThisPc = computed(
  () => hasPinnedFolders.value || specialFolders.value.length > 0,
)
</script>

<template>
  <aside class="win11-explorer-nav-pane" aria-label="Navigation">
    <div class="win11-explorer-nav-pane__scroll">
      <draggable
        v-model="quickAccessPinsModel"
        item-key="id"
        class="win11-explorer-nav-pane__quick-list"
        :delay="100"
        :delay-on-touch-only="false"
      >
        <template #item="{ element, index }">
          <button
            type="button"
            class="win11-explorer-nav-pane__node win11-explorer-nav-pane__quick-item"
            :title="element.path"
            @click="go(element.path)"
          >
            <Icon :name="element.icon ?? 'mdi:folder'" size="16" />
            <span class="win11-explorer-nav-pane__label">{{ element.label }}</span>
            <span class="win11-explorer-nav-pane__meta">#{{ index + 1 }}</span>
            <Icon
              name="mdi:pin-off"
              size="14"
              class="win11-explorer-nav-pane__action win11-explorer-nav-pane__action--unpin"
              @click.stop="unpin(element.path)"
            />
          </button>
        </template>
      </draggable>

      <div
        v-if="specialFolders.length"
        class="win11-explorer-nav-pane__section"
        :class="{
          'win11-explorer-nav-pane__section--after-pins': showBorderBeforeShellFolders,
        }"
      >
        <div class="win11-explorer-nav-pane__shell-list">
          <button
            v-for="entry in specialFolders"
            :key="entry.id"
            type="button"
            class="win11-explorer-nav-pane__node win11-explorer-nav-pane__quick-item"
            :title="entry.path"
            @click="go(entry.path)"
            @contextmenu="onShellFolderContextMenu(entry, $event)"
          >
            <Icon :name="entry.icon ?? 'mdi:folder'" size="16" />
            <span class="win11-explorer-nav-pane__label">{{ entry.label }}</span>
            <Icon
              v-if="!isPinned(entry.path)"
              name="mdi:pin-outline"
              size="14"
              class="win11-explorer-nav-pane__action"
              @click.stop="pinFromSpecial(entry)"
            />
          </button>
        </div>
      </div>

      <div
        class="win11-explorer-nav-pane__section"
        :class="{
          'win11-explorer-nav-pane__section--after-pins': showBorderBeforeThisPc,
        }"
      >
        <div class="win11-explorer-nav-pane__title">This PC</div>
        <Tree
          v-model:expandedKeys="expandedKeys"
          :value="treeNodes"
          selection-mode="single"
          :selection-keys="selectedTreeKey ? { [selectedTreeKey]: true } : {}"
          @node-select="onNodeSelect"
        >
          <template #default="slotProps">
            <div class="win11-explorer-nav-pane__node">
              <Icon v-if="slotProps.node.icon" :name="slotProps.node.icon" size="16" />
              <span class="win11-explorer-nav-pane__label">{{ slotProps.node.label }}</span>
              <Icon
                v-if="
                  slotProps.node.data?.path &&
                    !isPinned(slotProps.node.data.path) &&
                    String(slotProps.node.key ?? '').startsWith('vol:')
                "
                name="mdi:pin-outline"
                size="14"
                class="win11-explorer-nav-pane__action"
                @click.stop="pinVolumeFromTree(slotProps.node)"
              />
            </div>
          </template>
        </Tree>
      </div>
    </div>

    <ContextMenu
      ref="shellFolderCtxMenu"
      :model="shellFolderMenuItems"
      :pt="explorerOverlayPt"
    />
  </aside>
</template>

<style scoped lang="scss">
.win11-explorer-nav-pane {
  --win11-explorer-nav-hover-bg: color-mix(
    in srgb,
    var(--win11-shell-text, #fff) 10%,
    transparent
  );
  --win11-explorer-nav-scrollbar-thumb: color-mix(
    in srgb,
    var(--win11-shell-text, #fff) 34%,
    transparent
  );
  --win11-explorer-nav-scrollbar-track: color-mix(
    in srgb,
    var(--win11-shell-text, #fff) 8%,
    transparent
  );

  display: flex;
  flex-direction: column;
  width: 248px;
  flex: 0 0 248px;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  border-right: 1px solid var(--win11-explorer-pane-divider);
  overflow: hidden;
}

/*
 * Single scroll region: flex-basis 0 + min-height 0 so this column shrinks inside the
 * main pane row and overflow-y actually creates a scrollbar (auto basis keeps content height).
 */
.win11-explorer-nav-pane__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 4px 6px 6px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--win11-explorer-nav-scrollbar-thumb)
    var(--win11-explorer-nav-scrollbar-track);
}

.win11-explorer-nav-pane__scroll::-webkit-scrollbar {
  width: 10px;
}

.win11-explorer-nav-pane__scroll::-webkit-scrollbar-track {
  margin: 2px 0;
  border-radius: 999px;
  background: var(--win11-explorer-nav-scrollbar-track);
}

.win11-explorer-nav-pane__scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  background-color: var(--win11-explorer-nav-scrollbar-thumb);
}

.win11-explorer-nav-pane__scroll::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(
    in srgb,
    var(--win11-shell-text, #fff) 48%,
    transparent
  );
}

.win11-explorer-nav-pane__section--after-pins {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid
    color-mix(in srgb, var(--win11-explorer-pane-divider, rgba(255, 255, 255, 0.12)) 80%, transparent);
}

.win11-explorer-nav-pane__title {
  font-size: 11px;
  opacity: 0.72;
  margin: 0 6px 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.win11-explorer-nav-pane__quick-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.win11-explorer-nav-pane__shell-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.win11-explorer-nav-pane__node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: inherit;
  min-height: 28px;
}

.win11-explorer-nav-pane__quick-item {
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: 4px;
  padding: 3px 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.win11-explorer-nav-pane__quick-item:hover,
.win11-explorer-nav-pane__quick-item:focus-visible {
  background: var(--win11-explorer-nav-hover-bg);
  outline: none;
}

/*
 * This PC (PrimeVue Tree): theme applies (a) row hover only when `.p-tree-node-selectable`
 * and not selected, and (b) a *separate* hover fill on `.p-tree-node-toggle-button`.
 * We override both so tree rows match pinned-folder button strips.
 */
.win11-explorer-nav-pane :deep(.p-tree) {
  padding: 0;
  border: none;
  background: transparent;
}

.win11-explorer-nav-pane :deep(.p-tree-root-children),
.win11-explorer-nav-pane :deep(.p-tree-node-children) {
  gap: 0;
}

.win11-explorer-nav-pane :deep(.p-tree-root-children) {
  padding-block-start: 0 !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-children) {
  padding-inline-start: 6px !important;
  margin: 0;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content) {
  border-radius: 4px;
  padding: 3px 6px !important;
  min-height: 28px !important;
  margin: 0;
  gap: 4px !important;
  align-items: center !important;
  transition: background 0.12s ease;
}

/* Slot replaces label — hide PrimeVue’s duplicate icon span */
.win11-explorer-nav-pane :deep(.p-tree-node-content > .p-tree-node-icon) {
  display: none !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-label) {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

/* Row hover — beats Aura `.p-tree-node-selectable:not(.p-tree-node-selected):hover` */
.win11-explorer-nav-pane :deep(.p-tree-node-content:hover) {
  background: var(--win11-explorer-nav-hover-bg) !important;
  color: inherit !important;
  box-shadow: none !important;
  outline: none !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content:focus-visible) {
  background: var(--win11-explorer-nav-hover-bg) !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Selected row at rest (Explorer sidebar tint); hover uses same wash as pinned rows */
.win11-explorer-nav-pane :deep(.p-tree-node-content.p-tree-node-selected) {
  background: color-mix(
      in srgb,
      var(--win11-shell-text, #fff) 8%,
      transparent
    )
    !important;
  color: inherit !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content.p-tree-node-selected:hover) {
  background: var(--win11-explorer-nav-hover-bg) !important;
}

/*
 * Remove expand chevron — sidebar stays expanded via store; rows align with pinned list.
 */
.win11-explorer-nav-pane :deep(.p-tree-node-toggle-button) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content:hover .p-tree-node-icon) {
  color: inherit !important;
}

.win11-explorer-nav-pane__label {
  flex: 1;
  min-width: 0;
}

.win11-explorer-nav-pane__meta {
  display: none;
}

.win11-explorer-nav-pane__action {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s ease;
}

/* Pinned row: keep unpin discoverable (Win11 shows pin affordance on hover). */
.win11-explorer-nav-pane__action--unpin {
  opacity: 0.72;
}

.win11-explorer-nav-pane__quick-item:hover .win11-explorer-nav-pane__action--unpin,
.win11-explorer-nav-pane__quick-item:focus-visible .win11-explorer-nav-pane__action--unpin {
  opacity: 1;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content:hover) .win11-explorer-nav-pane__action:not(.win11-explorer-nav-pane__action--unpin),
.win11-explorer-nav-pane
  :deep(.p-tree-node-content:focus-visible)
  .win11-explorer-nav-pane__action:not(.win11-explorer-nav-pane__action--unpin) {
  opacity: 0.85;
}

.win11-explorer-nav-pane__action:hover {
  opacity: 1 !important;
}
</style>
