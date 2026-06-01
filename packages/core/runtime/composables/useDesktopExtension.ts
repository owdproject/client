import { computed } from 'vue'
import { useDesktopConfig } from './useDesktopConfig'

/** Readonly slice for an extension namespace (`fs`, `terminal`, or custom `configKey`). */
export function useDesktopExtension<K extends string>(key: K) {
  const desktop = useDesktopConfig()
  return computed(() => desktop.value?.[key as keyof typeof desktop.value])
}
