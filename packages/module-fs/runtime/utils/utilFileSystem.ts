import { useRuntimeConfig } from 'nuxt/app'

export function getAppByFilename(filename: string): string | null {
  const runtimeConfig = useRuntimeConfig()
  const associations = runtimeConfig.public.desktop.fs?.fileAssociations || {}

  const parts = filename.toLowerCase().split('.')
  if (parts.length < 2) return null

  const ext = parts.pop() || ''

  return associations[ext] || null
}

export function getFilename(path: string): string | null {
  return path.replace(/^.*[\\/]/, '')
}
