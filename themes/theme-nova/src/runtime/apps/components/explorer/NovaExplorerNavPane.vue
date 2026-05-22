<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { useDesktopExplorerStore } from '@owdproject/core/runtime/stores/storeDesktopExplorer'
import { useRuntimeConfig } from 'nuxt/app'
import { computed, nextTick, onMounted, ref, withDefaults } from 'vue'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import draggable from 'vuedraggable'
import ContextMenu from 'primevue/contextmenu'
import type { MenuItem } from 'primevue/menuitem'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    window: IWindowController
    fsExplorer: NonNullable<IWindowController['fsExplorer']>
    /** Nav column width in px (parent splitter controls). */
    widthPx?: number
  }>(),
  { widthPx: 248 },
)

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

/** Single context menu: Open + Pin/Unpin for every nav row (pins, shell folders, This PC tree). */
const shellFolderCtxMenu = ref<InstanceType<typeof ContextMenu> | null>(null)
const shellFolderCtxTarget = ref<ExplorerNavFolder | null>(null)

const explorerOverlayPt = {
  root: { class: 'nova-explorer-popup-menu' },
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

function unwrapTreeSelectPayload(
  payload: TreeNode | { node?: TreeNode } | undefined,
): TreeNode | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  if ('node' in payload && (payload as { node?: TreeNode }).node) {
    return (payload as { node: TreeNode }).node
  }
  return payload as TreeNode
}

async function onNodeSelect(payload: TreeNode | { node?: TreeNode }) {
  const node = unwrapTreeSelectPayload(payload)
  const path = node?.data?.path
  if (typeof path !== 'string') return
  selectedTreeKey.value = String(node?.key ?? '')
  await go(path)
}

async function onNodeUnselect(payload: TreeNode | { node?: TreeNode }) {
  const node = unwrapTreeSelectPayload(payload)
  const path = node?.data?.path
  if (typeof path !== 'string') return
  await go(path)
}

function isPinned(path: string) {
  return desktopExplorerStore.quickAccessPins.some((entry) => entry.path === path)
}

function pinFromSpecial(entry: ExplorerNavFolder) {
  desktopExplorerStore.pinQuickAccess(entry)
}

function folderEntryFromTreeNode(node: TreeNode | undefined): ExplorerNavFolder | null {
  if (!node) return null
  const key = String(node.key ?? '')
  if (key === 'thisPc') {
    return {
      id: 'thispc',
      label: typeof node.label === 'string' ? node.label : 'This PC',
      path: '/',
      icon: typeof node.icon === 'string' ? node.icon : 'mdi:monitor',
    }
  }
  const path = node.data?.path
  if (typeof path !== 'string' || !path.startsWith('/')) return null
  return {
    id: `nav:${path}`,
    label: typeof node.label === 'string' ? node.label : path,
    path,
    icon: typeof node.icon === 'string' ? node.icon : 'mdi:harddisk',
  }
}

function treePinVisible(node: TreeNode | undefined): boolean {
  const e = folderEntryFromTreeNode(node)
  return Boolean(e && !isPinned(e.path))
}

function pinTreeNode(node: TreeNode) {
  const e = folderEntryFromTreeNode(node)
  if (!e) return
  pinFromSpecial({
    id: `pin:${e.path}`,
    label: e.label,
    path: e.path,
    icon: e.icon,
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

async function openNavFolderContextMenu(entry: ExplorerNavFolder, event: MouseEvent) {
  event.preventDefault()
  shellFolderCtxTarget.value = entry
  await nextTick()
  shellFolderCtxMenu.value?.show(event)
}

async function onTreeRowContextMenu(node: TreeNode | undefined, event: MouseEvent) {
  const entry = folderEntryFromTreeNode(node)
  if (!entry) return
  await openNavFolderContextMenu(entry, event)
}

const hasPinnedFolders = computed(() => quickAccessPinsModel.value.length > 0)

const showBorderBeforeShellFolders = computed(() => hasPinnedFolders.value)

const showBorderBeforeThisPc = computed(
  () => hasPinnedFolders.value || specialFolders.value.length > 0,
)
</script>

<template>
  <aside
    class="nova-explorer-nav-pane"
    aria-label="Navigation"
    :style="{
      width: `${props.widthPx}px`,
      flex: `0 0 ${props.widthPx}px`,
    }"
  >
    <div class="nova-explorer-nav-pane__scroll">
      <draggable
        v-model="quickAccessPinsModel"
        item-key="id"
        class="nova-explorer-nav-pane__quick-list"
        :delay="100"
        :delay-on-touch-only="false"
      >
        <template #item="{ element, index }">
          <button
            type="button"
            class="nova-explorer-nav-pane__node nova-explorer-nav-pane__quick-item"
            :title="element.path"
            @click="go(element.path)"
            @contextmenu="openNavFolderContextMenu(element, $event)"
          >
            <Icon :name="element.icon ?? 'mdi:folder'" size="16" />
            <span class="nova-explorer-nav-pane__label">{{ element.label }}</span>
            <span class="nova-explorer-nav-pane__meta">#{{ index + 1 }}</span>
            <Icon
              name="mdi:pin-off"
              size="14"
              class="nova-explorer-nav-pane__action nova-explorer-nav-pane__action--unpin"
              @click.stop="unpin(element.path)"
            />
          </button>
        </template>
      </draggable>

      <div
        v-if="specialFolders.length"
        class="nova-explorer-nav-pane__section"
        :class="{
          'nova-explorer-nav-pane__section--after-pins': showBorderBeforeShellFolders,
        }"
      >
        <div class="nova-explorer-nav-pane__shell-list">
          <button
            v-for="entry in specialFolders"
            :key="entry.id"
            type="button"
            class="nova-explorer-nav-pane__node nova-explorer-nav-pane__quick-item"
            :title="entry.path"
            @click="go(entry.path)"
            @contextmenu="openNavFolderContextMenu(entry, $event)"
          >
            <Icon :name="entry.icon ?? 'mdi:folder'" size="16" />
            <span class="nova-explorer-nav-pane__label">{{ entry.label }}</span>
            <Icon
              v-if="!isPinned(entry.path)"
              name="mdi:pin-outline"
              size="14"
              class="nova-explorer-nav-pane__action"
              @click.stop="pinFromSpecial(entry)"
            />
          </button>
        </div>
      </div>

      <div
        class="nova-explorer-nav-pane__section"
        :class="{
          'nova-explorer-nav-pane__section--after-pins': showBorderBeforeThisPc,
        }"
      >
        <div class="nova-explorer-nav-pane__title">This PC</div>
        <Tree
          v-model:expandedKeys="expandedKeys"
          :value="treeNodes"
          selection-mode="single"
          :selection-keys="selectedTreeKey ? { [selectedTreeKey]: true } : {}"
          @node-select="onNodeSelect"
          @node-unselect="onNodeUnselect"
        >
          <template #default="slotProps">
            <div
              class="nova-explorer-nav-pane__node"
              @contextmenu.prevent="onTreeRowContextMenu(slotProps.node, $event)"
            >
              <Icon v-if="slotProps.node.icon" :name="slotProps.node.icon" size="16" />
              <span class="nova-explorer-nav-pane__label">{{ slotProps.node.label }}</span>
              <Icon
                v-if="treePinVisible(slotProps.node)"
                name="mdi:pin-outline"
                size="14"
                class="nova-explorer-nav-pane__action"
                @click.stop="pinTreeNode(slotProps.node)"
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
.nova-explorer-nav-pane {
  background: var(--nova-explorer-surface-elevated);
  border-inline-end: 1px solid var(--nova-explorer-border-subtle);

  --nova-explorer-nav-hover-bg: color-mix(
    in srgb,
    var(--nova-explorer-text) 10%,
    transparent
  );
  --nova-explorer-nav-scrollbar-thumb: color-mix(
    in srgb,
    var(--nova-explorer-text, #fff) 34%,
    transparent
  );
  --nova-explorer-nav-scrollbar-track: color-mix(
    in srgb,
    var(--nova-explorer-text, #fff) 8%,
    transparent
  );

  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  align-self: stretch;
  overflow: hidden;
}

/*
 * Single scroll region: flex-basis 0 + min-height 0 so this column shrinks inside the
 * main pane row and overflow-y actually creates a scrollbar (auto basis keeps content height).
 */
.nova-explorer-nav-pane__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 4px 6px 6px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--nova-explorer-nav-scrollbar-thumb)
    var(--nova-explorer-nav-scrollbar-track);
}

.nova-explorer-nav-pane__scroll::-webkit-scrollbar {
  width: 10px;
}

.nova-explorer-nav-pane__scroll::-webkit-scrollbar-track {
  margin: 2px 0;
  border-radius: 999px;
  background: var(--nova-explorer-nav-scrollbar-track);
}

.nova-explorer-nav-pane__scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  background-color: var(--nova-explorer-nav-scrollbar-thumb);
}

.nova-explorer-nav-pane__scroll::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(
    in srgb,
    var(--nova-explorer-text, #fff) 48%,
    transparent
  );
}

.nova-explorer-nav-pane__section--after-pins {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid
    color-mix(in srgb, var(--nova-explorer-pane-divider, rgba(255, 255, 255, 0.12)) 80%, transparent);
}

.nova-explorer-nav-pane__title {
  font-size: 11px;
  opacity: 0.72;
  margin: 0 6px 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.nova-explorer-nav-pane__quick-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nova-explorer-nav-pane__shell-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nova-explorer-nav-pane__node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: inherit;
  min-height: 28px;
}

.nova-explorer-nav-pane__quick-item {
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: var(--nova-window-control-radius, 8px);
  padding: 3px 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.nova-explorer-nav-pane__quick-item:hover,
.nova-explorer-nav-pane__quick-item:focus-visible {
  background: var(--nova-explorer-nav-hover-bg);
  outline: none;
}

/*
 * This PC (PrimeVue Tree): theme applies (a) row hover only when `.p-tree-node-selectable`
 * and not selected, and (b) a *separate* hover fill on `.p-tree-node-toggle-button`.
 * We override both so tree rows match pinned-folder button strips.
 */
.nova-explorer-nav-pane :deep(.p-tree) {
  padding: 0;
  border: none;
  background: transparent;
}

.nova-explorer-nav-pane :deep(.p-tree-root-children),
.nova-explorer-nav-pane :deep(.p-tree-node-children) {
  gap: 0;
}

.nova-explorer-nav-pane :deep(.p-tree-root-children) {
  padding-block-start: 0 !important;
}

.nova-explorer-nav-pane :deep(.p-tree-node-children) {
  padding-inline-start: 6px !important;
  margin: 0;
}

.nova-explorer-nav-pane :deep(.p-tree-node-content) {
  border-radius: var(--nova-window-control-radius, 8px);
  padding: 0 6px !important;
  min-height: 28px !important;
  margin: 0;
  gap: 4px !important;
  align-items: center !important;
  transition: background 0.12s ease;
}

/* Slot replaces label — hide PrimeVue’s duplicate icon span */
.nova-explorer-nav-pane :deep(.p-tree-node-content > .p-tree-node-icon) {
  display: none !important;
}

.nova-explorer-nav-pane :deep(.p-tree-node-label) {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

/* Row hover — beats Aura `.p-tree-node-selectable:not(.p-tree-node-selected):hover` */
.nova-explorer-nav-pane :deep(.p-tree-node-content:hover) {
  background: var(--nova-explorer-nav-hover-bg) !important;
  color: inherit !important;
  box-shadow: none !important;
  outline: none !important;
}

.nova-explorer-nav-pane :deep(.p-tree-node-content:focus-visible) {
  background: var(--nova-explorer-nav-hover-bg) !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Selected row at rest (Explorer sidebar tint); hover uses same wash as pinned rows */
.nova-explorer-nav-pane :deep(.p-tree-node-content.p-tree-node-selected) {
  background: var(--nova-accent-muted) !important;
  color: var(--nova-explorer-text) !important;
  box-shadow: inset 2px 0 0 var(--nova-explorer-accent-line);
}

.nova-explorer-nav-pane :deep(.p-tree-node-content.p-tree-node-selected:hover) {
  background: var(--nova-explorer-nav-hover-bg) !important;
}

/*
 * Remove expand chevron — sidebar stays expanded via store; rows align with pinned list.
 */
.nova-explorer-nav-pane :deep(.p-tree-node-toggle-button) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

.nova-explorer-nav-pane :deep(.p-tree-node-content:hover .p-tree-node-icon) {
  color: inherit !important;
}

.nova-explorer-nav-pane__label {
  flex: 1;
  min-width: 0;
}

.nova-explorer-nav-pane__meta {
  display: none;
}

.nova-explorer-nav-pane__action {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.1s ease;
}

/* Pinned row: keep unpin discoverable on hover. */
.nova-explorer-nav-pane__action--unpin {
  opacity: 0.72;
}

.nova-explorer-nav-pane__quick-item:hover .nova-explorer-nav-pane__action--unpin,
.nova-explorer-nav-pane__quick-item:focus-visible .nova-explorer-nav-pane__action--unpin {
  opacity: 1;
}

.nova-explorer-nav-pane :deep(.p-tree-node-content:hover) .nova-explorer-nav-pane__action:not(.nova-explorer-nav-pane__action--unpin),
.nova-explorer-nav-pane
  :deep(.p-tree-node-content:focus-visible)
  .nova-explorer-nav-pane__action:not(.nova-explorer-nav-pane__action--unpin) {
  opacity: 0.85;
}

.nova-explorer-nav-pane__action:hover {
  opacity: 1 !important;
}
</style>
