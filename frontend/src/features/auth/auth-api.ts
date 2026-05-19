import type {
  AuthResponse,
  GoogleAuthRequest,
  LoginRequest,
  RegisterRequest,
  TokenPair,
  User,
  UserUpdateRequest,
} from '@/features/auth/types'
import { clearTokens, getRefreshToken, setTokens } from '@/features/auth/token-storage'
import { apiRequest } from '@/shared/api/client'
import { rawApiRequest } from '@/shared/api/raw-request'

export async function register(body: RegisterRequest): Promise<AuthResponse> {
  return rawApiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body,
  })
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  return rawApiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body,
  })
}

export async function loginWithGoogle(body: GoogleAuthRequest): Promise<AuthResponse> {
  return rawApiRequest<AuthResponse>('/auth/google', {
    method: 'POST',
    body,
  })
}

export async function refreshTokens(refresh?: string): Promise<TokenPair> {
  const token = refresh ?? getRefreshToken()
  if (!token) {
    throw new Error('No refresh token')
  }
  const tokens = await rawApiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refresh: token },
  })
  setTokens(tokens)
  return tokens
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken()
  try {
    await rawApiRequest<void>('/auth/logout', {
      method: 'POST',
      body: refresh ? { refresh } : undefined,
    })
  } finally {
    clearTokens()
  }
}

export async function fetchCurrentUser(): Promise<User> {
  return apiRequest<User>('/users/me')
}

export async function updateCurrentUser(body: UserUpdateRequest): Promise<User> {
  return apiRequest<User>('/users/me', {
    method: 'PATCH',
    body,
  })
}
