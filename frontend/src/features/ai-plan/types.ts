import type { components } from '@/shared/api/schema'

export type PlanGenerateRequest = components['schemas']['PlanGenerateRequest']
export type AsyncTaskAccepted = components['schemas']['AsyncTaskAccepted']
export type AsyncTask = components['schemas']['AsyncTask']

export type PlanTaskResult = {
  plan_version_id?: string
  adjustments?: string[]
  summary?: string
}

export type PlanTask = AsyncTask & {
  result?: PlanTaskResult | null
}
