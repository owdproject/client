<script setup>
import { fs } from "@zenfs/core";
import { explorerEntryAbsolutePath } from "@owdproject/core/runtime/utils/explorerEntryPath";
import { ref, computed, watch } from "vue";
import FileContextMenu from "./FileContextMenu.vue";
import FileIcon from "./FileIcon.vue";
import { useExplorerInternalDrag } from "../../composables/useExplorerInternalDrag";
import { useExplorerFolderDropTarget } from "../../composables/useExplorerFolderDropTarget";
const props = defineProps({
  basePath: { type: String, required: true },
  fileName: { type: String, required: true },
  layout: { type: String, required: true },
  selected: { type: Boolean, required: false },
  cutted: { type: Boolean, required: false },
  window: { type: Object, required: true },
  contextMenuComponent: { type: null, required: false },
  openPathInNewTab: { type: Function, required: false },
  dragEnabled: { type: Boolean, required: false }
});
const menuImpl = computed(
  () => props.contextMenuComponent ?? FileContextMenu
);
const emit = defineEmits([
  "openDirectory",
  "openFile",
  "rename"
]);
const path = computed(
  () => explorerEntryAbsolutePath(props.basePath, props.fileName)
);
const pathStats = ref(null);
const isDirectory = ref(false);
const isFile = ref();
const fileContent = ref(null);
const contextMenuRef = ref();
function fetchStatsAndContent(currentPath) {
  fs.stat(currentPath, (err, stats) => {
    if (err || !stats) {
      pathStats.value = null;
      isFile.value = false;
      isDirectory.value = false;
      console.error(err);
      return;
    }
    pathStats.value = stats;
    isFile.value = stats.isFile();
    isDirectory.value = stats.isDirectory();
    if (stats.isFile()) {
      try {
        fileContent.value = fs.readFileSync(currentPath, "utf-8");
      } catch (error) {
        console.error("Error while reading the file", error);
        fileContent.value = null;
      }
    } else {
      fileContent.value = null;
    }
  });
}
function onFileOpen() {
  if (isDirectory.value) {
    props.window.fsExplorer.openDirectory(props.fileName);
  } else {
    props.window.fsExplorer.openFile(props.fileName);
  }
}
function onRightClick(event) {
  contextMenuRef.value?.show(event);
}
function onAuxClick(event) {
  if (event.button !== 1) return;
  if (!isDirectory.value || !props.openPathInNewTab) return;
  event.preventDefault();
  event.stopPropagation();
  props.openPathInNewTab(path.value);
}
watch(
  path,
  (p) => {
    fetchStatsAndContent(p);
  },
  { immediate: true }
);
const isRenaming = ref(false);
const editableName = ref(props.fileName);
function renameCommit() {
  const newName = editableName.value.trim();
  if (newName && newName !== props.fileName) {
    emit("rename", { oldName: props.fileName, newName });
  }
  isRenaming.value = false;
}
function renameStart() {
  editableName.value = props.fileName;
  isRenaming.value = true;
}
function renameCancel() {
  editableName.value = props.fileName;
  isRenaming.value = false;
}
const isRowLayout = computed(
  () => props.layout === "list" || props.layout === "details"
);
function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "\u2014";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const rounded = v < 10 && i > 0 ? v.toFixed(1) : String(Math.round(v));
  return `${rounded} ${units[i]}`;
}
function statToDate(stats) {
  if (!stats) return null;
  const m = stats.mtime;
  if (m instanceof Date) return m;
  if (typeof m === "number") return new Date(m);
  return null;
}
const modifiedLabel = computed(() => {
  const d = statToDate(pathStats.value);
  if (!d || Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString(void 0, {
    dateStyle: "short",
    timeStyle: "short"
  });
});
const typeLabel = computed(() => {
  if (isDirectory.value) return "File folder";
  const parts = props.fileName.split(".");
  if (parts.length < 2) return "File";
  return `${parts.pop().toUpperCase()} file`;
});
const sizeLabel = computed(() => {
  if (!pathStats.value || isDirectory.value) return "\u2014";
  if (!pathStats.value.isFile()) return "\u2014";
  return formatBytes(pathStats.value.size);
});
const dragEnabled = computed(() => props.dragEnabled ?? true);
const { onDragStart } = useExplorerInternalDrag({
  entryPath: () => path.value,
  selectedFiles: () => props.window.fsExplorer?.selectedFiles.value ?? [],
  dragEnabled: () => dragEnabled.value
});
const folderDrop = useExplorerFolderDropTarget({
  fsExplorer: props.window.fsExplorer,
  folderPath: () => path.value,
  enabled: () => dragEnabled.value && isDirectory.value
});
const classes = computed(() => {
  const list = [
    "owd-file",
    isRowLayout.value ? "owd-file--row text-left" : "text-center"
  ];
  if (props.layout) {
    list.push(`owd-file--size-${props.layout}`);
  }
  list.push({ "owd-file--selected": props.selected });
  list.push({ "owd-file--cutted": props.cutted });
  list.push({ "kit-fs-explorer-folder-drop-target--active": folderDrop.isDragOver.value });
  return list;
});
</script>

<template>
  <div
    :class="classes"
    :title="fileName"
    :draggable="dragEnabled"
    @dragstart.stop="onDragStart"
    @dragenter="folderDrop.onDragEnter"
    @dragover="folderDrop.onDragOver"
    @dragleave="folderDrop.onDragLeave"
    @drop="folderDrop.onDrop"
    @dblclick="onFileOpen"
    @contextmenu.prevent="onRightClick"
    @auxclick.prevent="onAuxClick"
  >

    <template v-if="isRowLayout">
      <div class="owd-file__row">
        <div class="owd-file__icon-cell">
          <slot
            name="icon"
            :file-name="fileName"
            :is-directory="isDirectory"
            :layout="layout"
          >
            <FileIcon
              :file-name="fileName"
              :is-directory="isDirectory"
              :layout="layout"
            />
          </slot>
        </div>

        <div class="owd-file__name owd-file__name--row">
          <span
            v-if="!isRenaming"
            @dblclick.stop="renameStart"
            class="text-sm truncate"
            v-text="fileName"
          />

          <input
            v-else
            v-model="editableName"
            class="text-sm truncate border border-gray-300 rounded-sm px-1"
            @blur="renameCommit"
            @keyup.enter="renameCommit"
            @keyup.esc="renameCancel"
            autofocus
          />
        </div>

        <template v-if="layout === 'details'">
          <div
            class="owd-file__col owd-file__col--date tabular-nums"
            v-text="modifiedLabel"
          />
          <div
            class="owd-file__col owd-file__col--type"
            :title="typeLabel"
            v-text="typeLabel"
          />
          <div
            class="owd-file__col owd-file__col--size tabular-nums"
            v-text="sizeLabel"
          />
        </template>
      </div>
    </template>

    <template v-else>
      <div class="flex items-center rounded-sm p-2">
        <!--
      <FileSystemFileThumbnail
        v-if="layout === 'largeIcons' && isImageFile(fileName) && !isDirectory"
        :file-name="fileName"
        :path="path"
      />
      -->
        <slot
          name="icon"
          :file-name="fileName"
          :is-directory="isDirectory"
          :layout="layout"
        >
          <FileIcon
            :file-name="fileName"
            :is-directory="isDirectory"
            :layout="layout"
          />
        </slot>
      </div>

      <div class="owd-file__name">

        <span
          v-if="!isRenaming"
          @dblclick.stop="renameStart"
          :class="['truncate', { 'text-sm': layout !== 'smallIcons' }]"
          v-text="fileName"
        />

        <input
          v-else
          v-model="editableName"
          :class="[
  'truncate border border-gray-300 rounded-sm px-1',
  { 'text-sm': layout !== 'smallIcons' }
]"
          @blur="renameCommit"
          @keyup.enter="renameCommit"
          @keyup.esc="renameCancel"
          autofocus
        />

      </div>
    </template>
    <slot />

    <component
      :is="menuImpl"
      ref="contextMenuRef"
      :file-name="fileName"
      :window="window"
      :is-directory="!!isDirectory"
      :open-path-in-new-tab="openPathInNewTab"
      @open="onFileOpen"
      @rename="renameStart"
    />

  </div>
</template>

<style scoped>
.owd-file {
  display: inline-block;
  width: 78px;
  margin: 4px 6px;
}
.owd-file .owd-file__name {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  text-align: center;
}
.owd-file .owd-file__name input {
  border: 0;
  text-align: center;
  background: rgb(var(--owd-elevation-active-background));
  color: rgb(var(--owd-elevation-active-color)) !important;
}
.owd-file .owd-file__name span {
  display: block;
}
.owd-file--size-smallIcons .owd-file__name .truncate,
.owd-file--size-smallIcons .owd-file__name input {
  /* Between Tailwind text-xs (12px) and text-sm (14px): readable on dense grids */
  font-size: 0.8125rem;
  line-height: 1.35;
  max-width: 76px;
}
.owd-file--size-largeIcons {
  width: 86px;
  margin: 10px 8px;
}
.owd-file--size-largeIcons :deep(img) {
  image-rendering: pixelated;
  zoom: 1.5;
}
.owd-file--size-list, .owd-file--size-details {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 1px 0;
  padding: 0 4px;
}
.owd-file--size-list .owd-file__row, .owd-file--size-details .owd-file__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 2px 8px;
  border-radius: 2px;
}
.owd-file--size-list .owd-file__icon-cell, .owd-file--size-details .owd-file__icon-cell {
  flex-shrink: 0;
  width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.owd-file--size-list .owd-file__name--row, .owd-file--size-details .owd-file__name--row {
  flex: 1;
  min-width: 0;
  display: block;
}
.owd-file--size-list .owd-file__name--row input, .owd-file--size-details .owd-file__name--row input {
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.owd-file--size-list .owd-file__name--row .truncate, .owd-file--size-details .owd-file__name--row .truncate {
  max-width: none;
  display: block;
  text-align: left;
}
.owd-file--size-list .owd-file__col, .owd-file--size-details .owd-file__col {
  flex-shrink: 0;
  font-size: 0.75rem;
  line-height: 1.25;
  opacity: 0.88;
  white-space: nowrap;
}
.owd-file--size-list .owd-file__col--date, .owd-file--size-details .owd-file__col--date {
  width: 132px;
  text-align: right;
}
.owd-file--size-list .owd-file__col--type, .owd-file--size-details .owd-file__col--type {
  width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.owd-file--size-list .owd-file__col--size, .owd-file--size-details .owd-file__col--size {
  width: 72px;
  text-align: right;
}
.owd-file--size-details .owd-file__icon-cell {
  width: 30px;
}
.owd-file--selected:not(.owd-file--row) .owd-file__name {
  background: rgb(var(--owd-elevation-active-background));
  color: rgb(var(--owd-elevation-active-color)) !important;
}
.owd-file--selected:not(.owd-file--row) .owd-file__name::after {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  content: "";
  border: 1px dotted rgb(var(--owd-theme-color-white));
}
.owd-file.owd-file--row.owd-file--selected .owd-file__row {
  background: rgb(var(--owd-elevation-active-background));
  color: rgb(var(--owd-elevation-active-color));
}
.owd-file.owd-file--row.owd-file--selected .owd-file__row .owd-file__col {
  color: inherit;
  opacity: 1;
}
.owd-file.owd-file--row.owd-file--selected .owd-file__row::after {
  position: absolute;
  inset: 0;
  content: "";
  border: 1px dotted rgb(var(--owd-theme-color-white));
  pointer-events: none;
  border-radius: 2px;
}
.owd-file--cutted {
  opacity: 0.6;
}
.owd-file.kit-fs-explorer-folder-drop-target--active {
  outline: 2px dashed var(--owd-explorer-drop-outline, var(--p-primary-color, #3b82f6));
  outline-offset: -2px;
  background: var(--owd-explorer-drop-surface, color-mix(in srgb, var(--owd-explorer-drop-outline, var(--p-primary-color, #3b82f6)) 8%, transparent));
}

.truncate {
  max-width: 86px;
  overflow: hidden;
  display: inline-block;
}
</style>
