import { create } from 'zustand'

import {
  fetchCurrentUser,
  logout as logoutApi,
  refreshTokens,
} from '@/features/auth/auth-api'
import type { AuthResponse, TokenPair, User } from '@/features/auth/types'
import { clearTokens, getRefreshToken, setTokens } from '@/features/auth/token-storage'
import { applyUserPreferences } from '@/features/settings/apply-user-preferences'

type AuthState = {
  user: User | null
  isHydrated: boolean
  setSession: (payload: AuthResponse) => void
  updateUser: (user: User) => void
  clearSession: () => void
  hydrate: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isHydrated: false,

  setSession: ({ user, tokens }) => {
    setTokens(tokens)
    applyUserPreferences(user)
    set({ user })
  },

  updateUser: (user) => {
    applyUserPreferences(user)
    set({ user })
  },

  clearSession: () => {
    clearTokens()
    set({ user: null })
  },

  hydrate: async () => {
    const refresh = getRefreshToken()
    if (!refresh) {
      set({ isHydrated: true })
      return
    }

    try {
      const tokens: TokenPair = await refreshTokens(refresh)
      setTokens(tokens)
      const user = await fetchCurrentUser()
      applyUserPreferences(user)
      set({ user, isHydrated: true })
    } catch {
      clearTokens()
      set({ user: null, isHydrated: true })
    }
  },

  logout: async () => {
    try {
      await logoutApi()
    } finally {
      get().clearSession()
    }
  },
}))
