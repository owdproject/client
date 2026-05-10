<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  path: string
  rootLabel?: string
  ariaLabel?: string
  addressAriaLabel?: string
  searchPlaceholder?: string
  /** Inline address field between crumbs and search (Win11 skin usually hides this). */
  showAddress?: boolean
  showSearch?: boolean
}>(), {
  rootLabel: 'This PC',
  ariaLabel: 'Path breadcrumb',
  addressAriaLabel: 'Address',
  searchPlaceholder: '',
  showAddress: true,
  showSearch: true,
})

const emit = defineEmits<{
  navigate: [path: string]
  commit: [path: string]
}>()

const localPath = ref(props.path)

function normalizePath(value: unknown): string {
  if (typeof value !== 'string') return '/'
  const p = value.trim()
  return p || '/'
}

watch(
  () => props.path,
  (v) => {
    localPath.value = normalizePath(v)
  },
)

const segments = computed(() => {
  const p = normalizePath(props.path)
  const root = props.rootLabel
  if (p === '/') {
    return [{ label: root, path: '/' }]
  }
  const parts = p.split('/').filter(Boolean)
  const out: { label: string; path: string }[] = [{ label: root, path: '/' }]
  let acc = ''
  for (const part of parts) {
    acc = acc === '' ? `/${part}` : `${acc}/${part}`
    out.push({ label: part, path: acc })
  }
  return out
})

function onPathCommit() {
  emit('commit', localPath.value)
}
</script>

<template>
  <div class="explorer-breadcrumb-base" data-part="breadcrumb-root">
    <nav
      class="explorer-breadcrumb-base__crumbs"
      data-part="breadcrumb-crumbs"
      :aria-label="ariaLabel"
    >
      <template v-for="(seg, i) in segments" :key="seg.path">
        <span
          v-if="i > 0"
          class="explorer-breadcrumb-base__chev"
          data-part="breadcrumb-chevron"
          aria-hidden="true"
        >
          ›
        </span>
        <button
          type="button"
          class="explorer-breadcrumb-base__segment"
          data-part="breadcrumb-segment"
          :aria-current="i === segments.length - 1 ? 'page' : undefined"
          @click="emit('navigate', seg.path)"
        >
          {{ seg.label }}
        </button>
      </template>
    </nav>

    <input
      v-if="showAddress"
      v-model="localPath"
      class="explorer-breadcrumb-base__input"
      data-part="breadcrumb-address"
      type="text"
      spellcheck="false"
      :aria-label="addressAriaLabel"
      @keydown.enter="onPathCommit"
    >

    <input
      v-if="showSearch"
      class="explorer-breadcrumb-base__search"
      data-part="breadcrumb-search"
      type="text"
      :placeholder="searchPlaceholder"
      disabled
      aria-disabled="true"
    >
  </div>
</template>

<style scoped lang="scss">
.explorer-breadcrumb-base {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}

.explorer-breadcrumb-base__crumbs {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.explorer-breadcrumb-base__segment {
  border: none;
  color: inherit;
  padding: 0;
}

.explorer-breadcrumb-base__input,
.explorer-breadcrumb-base__search {
  min-height: 36px;
  min-width: 0;
  margin: 8px 8px 8px 0;
}
</style>
