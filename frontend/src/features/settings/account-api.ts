import { apiRequest } from '@/shared/api/client'

export async function exportUserData(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/users/me/export')
}

export async function deleteCurrentUser(): Promise<void> {
  return apiRequest<void>('/users/me', {
    method: 'DELETE',
    body: { confirm: 'DELETE' },
  })
}
