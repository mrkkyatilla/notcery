import { apiRequest } from '@/shared/api/client'

import type { BillingSummary } from '@/features/library/types'

export type CheckoutSession = {
  checkout_url: string
  session_id?: string
}

export type PortalSession = {
  portal_url: string
}

export async function fetchBillingMe(): Promise<BillingSummary> {
  return apiRequest<BillingSummary>('/billing/me')
}

export async function createBillingCheckout(): Promise<CheckoutSession> {
  return apiRequest<CheckoutSession>('/billing/checkout', { method: 'POST' })
}

export async function createBillingPortal(): Promise<PortalSession> {
  return apiRequest<PortalSession>('/billing/portal', { method: 'POST' })
}
