import { computed, ref } from 'vue'

/**
 * Shell session identity shown in the Win11 Start footer / taskbar.
 * Default: **Guest**. Bluesky or other auth modules can call {@link setShellUser} after login.
 *
 * Singleton module state so every caller sees the same user.
 */
const displayName = ref('Guest')
const avatarUrl = ref<string | null>(null)

export function useWin11ShellUser() {
  const isGuest = computed(
    () =>
      displayName.value === 'Guest' ||
      displayName.value.trim().length === 0,
  )

  function setShellUser(name: string, avatar?: string | null) {
    displayName.value = name.trim() || 'Guest'
    avatarUrl.value = avatar ?? null
  }

  function clearShellUser() {
    displayName.value = 'Guest'
    avatarUrl.value = null
  }

  return {
    displayName,
    avatarUrl,
    isGuest,
    setShellUser,
    clearShellUser,
  }
}
