import { defineNuxtPlugin, useNuxtApp } from 'nuxt/app'
import { configure, InMemory } from '@zenfs/core'
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
    const config = nuxtApp.$config.public.desktop.fs
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
  },
})
