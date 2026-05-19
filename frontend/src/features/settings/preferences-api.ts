import { useAuthStore } from '@/features/auth/auth-store'
import { updateCurrentUser } from '@/features/auth/auth-api'
import type { Locale } from '@/shared/api/locale'
import type { Theme } from '@/shared/theme/theme-store'
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback'

export function useDebouncedProfilePatch() {
  const updateUser = useAuthStore((s) => s.updateUser)

  return useDebouncedCallback(async (patch: { locale?: Locale; theme?: Theme }) => {
    const user = useAuthStore.getState().user
    if (!user) return
    const updated = await updateCurrentUser(patch)
    updateUser(updated)
  }, 300)
}
