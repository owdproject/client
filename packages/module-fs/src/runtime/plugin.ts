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

    const baseURL =
      (typeof nuxtApp.$config?.app?.baseURL === 'string' && nuxtApp.$config.app.baseURL) ||
      '/'

    function resolveZipFetchUrl(spec: string): string {
      if (spec.startsWith('http://') || spec.startsWith('https://')) return spec
      const path = spec.startsWith('/') ? spec : `/${spec}`
      const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
      if (!base || base === '') return path
      return `${base}${path}`
    }

    function hexPreview(u8: Uint8Array, max = 24): string {
      const n = Math.min(u8.length, max)
      return Array.from(u8.subarray(0, n))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
    }

    /**
     * Find first ZIP local file header (PK\x03\x04). Strips UTF-8 BOM or a leading prefix
     * (e.g. self-extracting stub) within the first 512 KiB.
     */
    function sliceZipPayload(buf: ArrayBuffer, mountPoint: string, url: string): ArrayBuffer {
      const full = new Uint8Array(buf)
      let start = 0
      if (full.length >= 3 && full[0] === 0xef && full[1] === 0xbb && full[2] === 0xbf) {
        start = 3
      }
      const u8 = full.subarray(start)
      const maxScan = Math.min(Math.max(0, u8.length - 3), 512 * 1024)
      let rel = -1
      for (let i = 0; i <= maxScan; i++) {
        if (
          u8[i] === 0x50 &&
          u8[i + 1] === 0x4b &&
          u8[i + 2] === 0x03 &&
          u8[i + 3] === 0x04
        ) {
          rel = i
          break
        }
      }
      if (rel < 0) {
        throw new Error(
          `[@owdproject/module-fs] Zip mount "${mountPoint}": ${url} has no PK\\x03\\x04 local header in the first ${start + maxScan} bytes (${full.byteLength} B total). First bytes: ${hexPreview(full)}`,
        )
      }
      const absolute = start + rel
      if (absolute === 0) return buf
      console.info(
        `[@owdproject/module-fs] Zip mount "${mountPoint}": skipping ${absolute} byte prefix before ZIP local header`,
      )
      return buf.slice(absolute)
    }

    // it's just a test, should be improved todo
    for await (const [mountPoint, value] of Object.entries(mounts)) {
      if (typeof value === 'string') {

        if (value.endsWith('.zip')) {

          const url = resolveZipFetchUrl(value)
          const res = await fetch(url)
          if (!res.ok) {
            throw new Error(
              `[@owdproject/module-fs] Zip mount "${mountPoint}": fetch ${url} failed with HTTP ${res.status}`,
            )
          }
          const buf = await res.arrayBuffer()
          const zipBytes = sliceZipPayload(buf, mountPoint, url)
          preparedMounts[mountPoint] = {
            backend: Zip,
            data: zipBytes,
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
