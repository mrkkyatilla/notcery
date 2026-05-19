import type { BillingSummary } from '@/features/library/types'

export type QuotaLimits = {
  plan_generate_per_week?: number | null
  chat_messages_per_day?: number | null
  storage_mb?: number | null
}

export type QuotaUsage = {
  plan_generate_this_week?: number
  chat_messages_today?: number
  storage_mb?: number
}

export function parseBillingLimits(raw: BillingSummary['limits']): QuotaLimits {
  if (!raw || typeof raw !== 'object') return {}
  return raw as unknown as QuotaLimits
}

export function parseBillingUsage(raw: BillingSummary['usage']): QuotaUsage {
  if (!raw || typeof raw !== 'object') return {}
  return raw as unknown as QuotaUsage
}

export function planQuotaRemaining(summary: BillingSummary | undefined): {
  used: number
  limit: number | null
} {
  const limits = parseBillingLimits(summary?.limits)
  const usage = parseBillingUsage(summary?.usage)
  return {
    used: usage.plan_generate_this_week ?? 0,
    limit: limits.plan_generate_per_week ?? null,
  }
}

export function chatQuotaRemaining(summary: BillingSummary | undefined): {
  used: number
  limit: number | null
} {
  const limits = parseBillingLimits(summary?.limits)
  const usage = parseBillingUsage(summary?.usage)
  return {
    used: usage.chat_messages_today ?? 0,
    limit: limits.chat_messages_per_day ?? null,
  }
}
