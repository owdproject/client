<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  fileName: string
  isDirectory: boolean
  layout: string
}>()

const ext = computed(
  () => props.fileName.split('.').pop()?.toLowerCase() ?? '',
)

/** Matches Win11 Home “Quick access” folder tiles (name-based). */
type KnownFolder =
  | 'desktop'
  | 'downloads'
  | 'documents'
  | 'pictures'
  | 'music'
  | 'videos'
  | 'generic'

function knownFolderKind(name: string): KnownFolder {
  const n = name.trim().toLowerCase()
  const map: Record<string, KnownFolder> = {
    desktop: 'desktop',
    downloads: 'downloads',
    documents: 'documents',
    pictures: 'pictures',
    music: 'music',
    videos: 'videos',
  }
  return map[n] ?? 'generic'
}

/** Accent colours aligned with Win11 folder tiles (dark theme). */
const FOLDER_STYLE: Record<
  KnownFolder,
  { icon: string; colorVar: string; fallback: string }
> = {
  desktop: {
    icon: 'mdi:folder-desktop',
    colorVar: '--win11-explorer-icon-desktop',
    fallback: '#5eb8ff',
  },
  downloads: {
    icon: 'mdi:folder-download',
    colorVar: '--win11-explorer-icon-downloads',
    fallback: '#3fd4e8',
  },
  documents: {
    icon: 'mdi:folder-file',
    colorVar: '--win11-explorer-icon-documents',
    fallback: '#c8c8c8',
  },
  pictures: {
    icon: 'mdi:folder-image',
    colorVar: '--win11-explorer-icon-pictures',
    fallback: '#5eb8ff',
  },
  music: {
    icon: 'mdi:folder-music',
    colorVar: '--win11-explorer-icon-music',
    fallback: '#f07ec7',
  },
  videos: {
    icon: 'mdi:folder-video',
    colorVar: '--win11-explorer-icon-videos',
    fallback: '#a78bfa',
  },
  generic: {
    icon: 'mdi:folder',
    colorVar: '--win11-explorer-icon-folder-generic',
    fallback: '#f3c84b',
  },
}

const FILE_EXT_META: Record<
  string,
  { icon: string; colorVar: string; fallback: string }
> = {
  mp4: {
    icon: 'mdi:filmstrip-box',
    colorVar: '--win11-explorer-icon-video',
    fallback: '#a78bfa',
  },
  webm: {
    icon: 'mdi:filmstrip-box',
    colorVar: '--win11-explorer-icon-video',
    fallback: '#a78bfa',
  },
  mp3: {
    icon: 'mdi:music-box-outline',
    colorVar: '--win11-explorer-icon-audio',
    fallback: '#f07ec7',
  },
  wav: {
    icon: 'mdi:music-box-outline',
    colorVar: '--win11-explorer-icon-audio',
    fallback: '#f07ec7',
  },
  flac: {
    icon: 'mdi:music-box-outline',
    colorVar: '--win11-explorer-icon-audio',
    fallback: '#f07ec7',
  },
  iso: {
    icon: 'mdi:disc',
    colorVar: '--win11-explorer-icon-disc',
    fallback: '#9aa0a6',
  },
  webp: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  gif: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  jpg: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  jpeg: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  png: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  svg: {
    icon: 'mdi:image-outline',
    colorVar: '--win11-explorer-icon-image',
    fallback: '#5eb8ff',
  },
  txt: {
    icon: 'mdi:file-document-outline',
    colorVar: '--win11-explorer-icon-document',
    fallback: '#d2d2d2',
  },
  md: {
    icon: 'mdi:language-markdown-outline',
    colorVar: '--win11-explorer-icon-document',
    fallback: '#d2d2d2',
  },
  pdf: {
    icon: 'mdi:file-pdf-box',
    colorVar: '--win11-explorer-icon-pdf',
    fallback: '#ff8585',
  },
  zip: {
    icon: 'mdi:folder-zip-outline',
    colorVar: '--win11-explorer-icon-archive',
    fallback: '#ffb84d',
  },
  rar: {
    icon: 'mdi:folder-zip-outline',
    colorVar: '--win11-explorer-icon-archive',
    fallback: '#ffb84d',
  },
  '7z': {
    icon: 'mdi:folder-zip-outline',
    colorVar: '--win11-explorer-icon-archive',
    fallback: '#ffb84d',
  },
  html: {
    icon: 'mdi:language-html5',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#7bd67f',
  },
  css: {
    icon: 'mdi:language-css3',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#7eb8ff',
  },
  js: {
    icon: 'mdi:language-javascript',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#efd966',
  },
  ts: {
    icon: 'mdi:language-typescript',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#68aef5',
  },
  vue: {
    icon: 'mdi:vuejs',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#7bd9a4',
  },
  json: {
    icon: 'mdi:code-json',
    colorVar: '--win11-explorer-icon-code',
    fallback: '#cfcfcf',
  },
}

const DEFAULT_FILE = {
  icon: 'mdi:file-outline',
  colorVar: '--win11-explorer-icon-file',
  fallback: 'rgba(235, 235, 235, 0.88)',
} as const

const glyph = computed(() => {
  if (props.isDirectory) {
    const kind = knownFolderKind(props.fileName)
    return FOLDER_STYLE[kind]
  }
  const e = ext.value
  return FILE_EXT_META[e] ?? DEFAULT_FILE
})

const iconName = computed(() => glyph.value.icon)

const iconColor = computed(() => {
  const { colorVar, fallback } = glyph.value
  return `var(${colorVar}, ${fallback})`
})

const iconSize = computed(() =>
  props.layout === 'largeIcons' ? '52' : '22',
)
</script>

<template>
  <Icon
    class="win11-explorer-file-icon"
    :name="iconName"
    :size="iconSize"
    aria-hidden="true"
    :style="{ color: iconColor }"
  />
</template>

<style scoped lang="scss">
.win11-explorer-file-icon {
  display: block;
  margin: 0 auto;
  flex-shrink: 0;
}
</style>
