import { computed } from 'vue'
import { useDesktopConfig } from './useDesktopConfig'

export function hasDesktopModule(pkg: string) {
  const desktop = useDesktopConfig()
  return computed(() => desktop.value?.modules?.includes(pkg) ?? false)
}

export function hasDesktopApp(pkg: string) {
  const desktop = useDesktopConfig()
  return computed(() => desktop.value?.apps?.includes(pkg) ?? false)
}

export function hasDesktopExtension(key: string) {
  const desktop = useDesktopConfig()
  return computed(() => Boolean(desktop.value?.[key as keyof typeof desktop.value]))
}
