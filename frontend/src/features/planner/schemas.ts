import { z } from 'zod'

import { STUDY_METHODS, STUDY_STATUSES, USER_FEEDBACKS } from '@/features/planner/types'

export const eventFormSchema = z
  .object({
    title: z.string().min(1).max(200),
    subject_id: z.union([z.string().uuid(), z.literal('')]).optional(),
    start_at: z.string().min(1),
    end_at: z.string().min(1),
    method: z.enum(STUDY_METHODS),
    status: z.enum(STUDY_STATUSES),
    user_feedback: z.enum(USER_FEEDBACKS).nullable().optional(),
  })
  .refine((data) => new Date(data.end_at) > new Date(data.start_at), {
    message: 'end_after_start',
    path: ['end_at'],
  })

export type EventFormValues = z.infer<typeof eventFormSchema>
