import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
import { defineNuxtPlugin } from 'nuxt/app'
import { usePinia } from 'pinia'
import { get, set, del } from 'idb-keyval'

export default defineNuxtPlugin({
  name: 'owd-plugin-persistence',
  parallel: true,
  async setup() {
    const pinia = usePinia()

    pinia.use(
      createPersistedStatePlugin({
        persist: false,
        storage: {
          getItem: async (key) => {
            const value = await get<string>(key)
            return value ?? null
          },
          setItem: async (key, value) => {
            await set(key, value)
          },
          removeItem: async (key) => {
            await del(key)
          },
        },
      }),
    )
  },
})
