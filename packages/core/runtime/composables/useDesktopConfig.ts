import { useRuntimeConfig } from 'nuxt/app'
import { computed } from 'vue'

/** Reactive view of `runtimeConfig.public.desktop` (full desktop.config merge + coreVersion). */
export function useDesktopConfig() {
  const runtimeConfig = useRuntimeConfig()
  return computed(() => runtimeConfig.public.desktop)
}
