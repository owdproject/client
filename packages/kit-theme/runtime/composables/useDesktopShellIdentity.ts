import { computed, ref } from 'vue'
import { useRuntimeConfig } from 'nuxt/app'

export type ShellIdentity = {
  userId: string
  displayName: string
  avatarUrl: string | null
  userHome: string
}

const GUEST_USER_ID = 'guest'

const identity = ref<ShellIdentity | null>(null)

export function sanitizeUserHomeSegment(input: string): string {
  const cleaned = input
    .trim()
    .replace(/^@/, '')
    .replace(/[^\w.\-]/g, '_')
    .slice(0, 64)
  return cleaned || 'user'
}

/** Build a VFS home path from an auth handle (e.g. Bluesky `@alice.bsky.social`). */
export function userHomeFromHandle(handle: string, base = '/home'): string {
  const baseNorm = base.endsWith('/') ? base.slice(0, -1) : base
  return `${baseNorm}/${sanitizeUserHomeSegment(handle)}`
}

function resolveDefaultHome(): string {
  try {
    const config = useRuntimeConfig()
    const desktop = config.public.desktop as {
      fs?: { defaultUserHome?: string }
    }
    const home = desktop.fs?.defaultUserHome?.trim()
    if (home) return home.startsWith('/') ? home : `/${home}`
  } catch {
    /* outside Nuxt setup */
  }
  return '/home/Guest'
}

function guestIdentity(defaultHome: string): ShellIdentity {
  return {
    userId: GUEST_USER_ID,
    displayName: 'Guest',
    avatarUrl: null,
    userHome: defaultHome,
  }
}

/**
 * Shell session identity (display + VFS home). Auth modules call {@link setShellIdentity}
 * after login; defaults to Guest.
 */
export function useDesktopShellIdentity() {
  function ensureIdentity(): ShellIdentity {
    if (!identity.value) {
      identity.value = guestIdentity(resolveDefaultHome())
    }
    return identity.value
  }

  const userId = computed(() => ensureIdentity().userId)
  const displayName = computed(() => ensureIdentity().displayName)
  const avatarUrl = computed(() => ensureIdentity().avatarUrl)
  const userHome = computed(() => ensureIdentity().userHome)
  const isGuest = computed(() => userId.value === GUEST_USER_ID)

  function setShellIdentity(partial: Partial<ShellIdentity>) {
    const current = ensureIdentity()
    identity.value = {
      ...current,
      ...partial,
      userId: partial.userId?.trim() || current.userId,
      displayName: partial.displayName?.trim() || current.displayName,
      userHome: partial.userHome?.trim()
        ? partial.userHome.startsWith('/')
          ? partial.userHome
          : `/${partial.userHome}`
        : current.userHome,
    }
  }

  function clearShellIdentity() {
    identity.value = guestIdentity(resolveDefaultHome())
  }

  return {
    userId,
    displayName,
    avatarUrl,
    userHome,
    isGuest,
    setShellIdentity,
    clearShellIdentity,
  }
}
