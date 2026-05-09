<script setup lang="ts">
import type { IWindowController } from '@owdproject/core'
import { useDesktopExplorerStore } from '@owdproject/core/runtime/stores/storeDesktopExplorer'
import { useRuntimeConfig } from 'nuxt/app'
import { computed, onMounted, ref } from 'vue'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import draggable from 'vuedraggable'

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

const desktopExplorerStore = useDesktopExplorerStore()
const runtimeConfig = useRuntimeConfig()
const selectedTreeKey = ref<string>('')

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
    : [
        ...normalizeFolderList(base),
        ...normalizeFolderList(extra),
      ]

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
    children: specialFolders.value.map((entry) => ({
      key: `thisPc:${entry.id}`,
      label: entry.label,
      icon: entry.icon ?? 'mdi:folder',
      data: {
        path: entry.path,
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

function unpin(path: string) {
  desktopExplorerStore.unpinQuickAccess(path)
}
</script>

<template>
  <aside class="win11-explorer-nav-pane" aria-label="Navigation">
    <div class="win11-explorer-nav-pane__title">Quick access</div>
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
            class="win11-explorer-nav-pane__action"
            @click.stop="unpin(element.path)"
          />
        </button>
      </template>
    </draggable>

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
            v-if="slotProps.node.data?.path && !isPinned(slotProps.node.data.path)"
            name="mdi:pin"
            size="14"
            class="win11-explorer-nav-pane__action"
            @click.stop="pinFromSpecial(slotProps.node.data)"
          />
        </div>
      </template>
    </Tree>
  </aside>
</template>

<style scoped lang="scss">
.win11-explorer-nav-pane {
  --win11-explorer-nav-hover-bg: color-mix(
    in srgb,
    var(--win11-shell-text, #fff) 10%,
    transparent
  );

  width: 248px;
  flex-shrink: 0;
  border-right: 1px solid color-mix(in srgb, var(--win11-window-border, rgba(255, 255, 255, 0.1)) 70%, transparent);
  padding: 8px 6px 10px 8px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--win11-shell-text, #fff) 24%, transparent) transparent;
}

.win11-explorer-nav-pane::-webkit-scrollbar {
  width: 8px;
}

.win11-explorer-nav-pane::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--win11-shell-text, #fff) 24%, transparent);
}

.win11-explorer-nav-pane__title {
  font-size: 11px;
  opacity: 0.72;
  margin: 10px 8px 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.win11-explorer-nav-pane__quick-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.win11-explorer-nav-pane__node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: inherit;
  min-height: 30px;
}

.win11-explorer-nav-pane__quick-item {
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: 5px;
  padding: 5px 8px;
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
 * We override both so the strip matches Quick access (`button` rows).
 */
.win11-explorer-nav-pane :deep(.p-tree) {
  padding: 0;
  border: none;
  background: transparent;
}

.win11-explorer-nav-pane :deep(.p-tree-root-children),
.win11-explorer-nav-pane :deep(.p-tree-node-children) {
  gap: 1px;
}

.win11-explorer-nav-pane :deep(.p-tree-node-content) {
  border-radius: 5px;
  padding: 5px 8px;
  min-height: 30px;
  margin: 1px 0;
  gap: 8px;
  transition: background 0.12s ease;
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

/* Selected row at rest (Explorer sidebar tint); hover uses same wash as Quick access */
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

/* Chevron: theme adds its own hover pill — remove so only the row highlights */
.win11-explorer-nav-pane :deep(.p-tree-node-toggle-button),
.win11-explorer-nav-pane :deep(.p-tree-node-toggle-button:hover),
.win11-explorer-nav-pane :deep(.p-tree-node-toggle-button:enabled:hover),
.win11-explorer-nav-pane :deep(.p-tree-node-content.p-tree-node-selected .p-tree-node-toggle-button:hover) {
  background: transparent !important;
  color: inherit !important;
  box-shadow: none !important;
}

.win11-explorer-nav-pane :deep(.p-tree-node-toggle-button) {
  margin-inline-end: 0;
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
  opacity: 0.75;
}

.win11-explorer-nav-pane__action:hover {
  opacity: 1;
}
</style>
