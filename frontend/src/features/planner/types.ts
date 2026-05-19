import type { components } from '@/shared/api/schema'

export type StudyEvent = components['schemas']['StudyEvent']
export type StudyEventCreate = components['schemas']['StudyEventCreate']
export type StudyEventUpdate = components['schemas']['StudyEventUpdate']
export type StudyEventResponse = components['schemas']['StudyEventResponse']
export type StudyMethod = components['schemas']['StudyMethod']
export type StudyEventStatus = components['schemas']['StudyEventStatus']
export type UserFeedback = components['schemas']['UserFeedback']
export type EventOverlapWarning = components['schemas']['EventOverlapWarning']
export type PlanVersion = components['schemas']['PlanVersion']
export type PlanVersionDetail = components['schemas']['PlanVersionDetail']
export type PlanSaveRequest = components['schemas']['PlanSaveRequest']

export const STUDY_METHODS = [
  'pomodoro',
  'active_recall',
  'spaced_review',
  'deep_reading',
  'practice_exam',
  'research',
] as const satisfies readonly StudyMethod[]

export const STUDY_STATUSES = ['planned', 'done', 'skipped'] as const satisfies readonly StudyEventStatus[]

export const USER_FEEDBACKS = ['easy', 'hard'] as const satisfies readonly NonNullable<UserFeedback>[]
