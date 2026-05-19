import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createBillingCheckout,
  createBillingPortal,
  fetchBillingMe,
} from '@/features/billing/billing-api'
import { showApiError } from '@/shared/api/show-api-error'

export function billingMeKey() {
  return ['billing', 'me'] as const
}

export function useBillingMe() {
  return useQuery({
    queryKey: billingMeKey(),
    queryFn: fetchBillingMe,
    staleTime: 60_000,
  })
}

export function useBillingCheckout() {
  return useMutation({
    mutationFn: createBillingCheckout,
    onSuccess: (session) => {
      if (session.checkout_url) {
        window.location.href = session.checkout_url
      }
    },
    onError: showApiError,
  })
}

export function useBillingPortal() {
  return useMutation({
    mutationFn: createBillingPortal,
    onSuccess: (session) => {
      if (session.portal_url) {
        window.location.href = session.portal_url
      }
    },
    onError: showApiError,
  })
}

export function useInvalidateBilling() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: billingMeKey() })
}
