import { useDesktopShellIdentity } from '@owdproject/kit-theme/runtime/composables/useDesktopShellIdentity'

/**
 * Win11 shell user display — delegates to {@link useDesktopShellIdentity}.
 * Auth modules should prefer `setShellIdentity` on kit-theme directly.
 */
export function useWin11ShellUser() {
  const identity = useDesktopShellIdentity()

  return {
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    isGuest: identity.isGuest,
    setShellUser(name: string, avatar?: string | null) {
      identity.setShellIdentity({
        displayName: name.trim() || 'Guest',
        avatarUrl: avatar ?? null,
      })
    },
    clearShellUser: identity.clearShellIdentity,
  }
}
