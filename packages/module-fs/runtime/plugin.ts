import { defineNuxtPlugin, useNuxtApp } from 'nuxt/app'
import { configure, InMemory, fs } from '@zenfs/core'
import { IndexedDB, WebStorage } from '@zenfs/dom'
import { Zip } from '@zenfs/archives'

const backendMap = {
  InMemory,
  IndexedDB,
  WebStorage,
}

export default defineNuxtPlugin({
  name: 'owd-plugin-fs',
  async setup(nuxtApp) {
    const desktopConfig = nuxtApp.$config.public.desktop
    const config = desktopConfig.fs
    const mounts = config.mounts

    const preparedMounts: Record<string, any> = {}

    // it's just a test, should be improved todo
    for await (const [mountPoint, value] of Object.entries(mounts)) {
      if (typeof value === 'string') {

        if (value.endsWith('.zip')) {

          const res = await fetch(value)
          preparedMounts[mountPoint] = {
            backend: Zip,
            data: await res.arrayBuffer(),
          }

        } else if (backendMap[value]) {

          preparedMounts[mountPoint] = backendMap[value]

        } else {
          console.warn(`Unknown FS backend: ${value}`)
        }
      } else {
        console.warn(`Unsupported mount config at ${mountPoint}`)
      }
    }

    await configure({
      mounts: preparedMounts,
    })

    const fsFolders = config.folders ?? {}
    const explorerFolders = desktopConfig.explorer ?? {}

    const normalizePath = (value: unknown): string | null => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      if (!trimmed) return null
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    }

    const collectFolderPaths = (
      list: unknown,
      field: 'path' | null = null,
    ): string[] => {
      if (!Array.isArray(list)) return []

      return list
        .map((item) => {
          if (!field) return normalizePath(item)
          if (typeof item === 'object' && item && field in item) {
            return normalizePath((item as Record<string, unknown>)[field])
          }
          return null
        })
        .filter((path): path is string => Boolean(path))
    }

    const commonFolders = collectFolderPaths(fsFolders.common)
    const extraFolders = collectFolderPaths(fsFolders.extra)
    const overrideFolders = collectFolderPaths(fsFolders.override)

    const themeSpecialFolders = collectFolderPaths(explorerFolders.specialFolders, 'path')
    const themeSpecialExtraFolders = collectFolderPaths(explorerFolders.specialFoldersExtra, 'path')
    const themeSpecialOverrideFolders = collectFolderPaths(explorerFolders.specialFoldersOverride, 'path')

    const mergedFolders = overrideFolders.length > 0
      ? overrideFolders
      : [
          ...commonFolders,
          ...extraFolders,
        ]

    const mergedSpecialFolders = themeSpecialOverrideFolders.length > 0
      ? themeSpecialOverrideFolders
      : [
          ...themeSpecialFolders,
          ...themeSpecialExtraFolders,
        ]

    for (const folderPath of new Set([...mergedFolders, ...mergedSpecialFolders])) {
      try {
        await fs.promises.mkdir(folderPath, { recursive: true })
      } catch (err) {
        console.warn(`Could not prepare folder: ${folderPath}`, err)
      }
    }
  },
})
