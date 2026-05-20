import { ref, watch } from 'vue'

export type NovaAccentId = 'ocean' | 'ember' | 'forest' | 'violet'

export type NovaAccentMeta = {
  id: NovaAccentId
  icon: string
}

export const NOVA_ACCENT_ORDER: NovaAccentId[] = [
  'ocean',
  'ember',
  'forest',
  'violet',
]

export const NOVA_ACCENT_META: Record<NovaAccentId, NovaAccentMeta> = {
  ocean: { id: 'ocean', icon: 'mdi:waves' },
  ember: { id: 'ember', icon: 'mdi:fire' },
  forest: { id: 'forest', icon: 'mdi:pine-tree' },
  violet: { id: 'violet', icon: 'mdi:flower' },
}

const STORAGE_KEY = 'owd-nova-accent'

const accentId = ref<NovaAccentId>('ocean')

function readStoredAccent(): NovaAccentId {
  if (typeof localStorage === 'undefined') return 'ocean'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && NOVA_ACCENT_ORDER.includes(stored as NovaAccentId)) {
    return stored as NovaAccentId
  }
  return 'ocean'
}

if (import.meta.client) {
  accentId.value = readStoredAccent()
}

watch(accentId, (id) => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, id)
  }
})

export function useNovaAccentTheme() {
  function cycleAccent() {
    const index = NOVA_ACCENT_ORDER.indexOf(accentId.value)
    const next = NOVA_ACCENT_ORDER[(index + 1) % NOVA_ACCENT_ORDER.length]
    accentId.value = next
  }

  function setAccent(id: NovaAccentId) {
    if (NOVA_ACCENT_ORDER.includes(id)) {
      accentId.value = id
    }
  }

  return {
    accentId,
    cycleAccent,
    setAccent,
    meta: NOVA_ACCENT_META,
  }
}
