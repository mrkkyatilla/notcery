import type { components } from '@/shared/api/schema'

export type Document = components['schemas']['Document']
export type DocumentCreate = components['schemas']['DocumentCreate']
export type UploadUrlRequest = components['schemas']['UploadUrlRequest']
export type UploadUrlResponse = components['schemas']['UploadUrlResponse']
export type RetrieveRequest = components['schemas']['RetrieveRequest']
export type RetrieveResponse = components['schemas']['RetrieveResponse']
export type DocumentStatus = NonNullable<Document['status']>

export type BillingSummary = components['schemas']['BillingSummary']

export type BillingLimits = {
  plan_generate_per_week?: number | null
  chat_messages_per_day?: number | null
  storage_mb?: number | null
}

export type BillingUsage = {
  plan_generate_this_week?: number
  chat_messages_today?: number
  storage_mb?: number
}
