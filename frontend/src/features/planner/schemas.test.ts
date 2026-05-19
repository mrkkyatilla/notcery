import { describe, expect, it } from 'vitest'

import { eventFormSchema } from '@/features/planner/schemas'

describe('eventFormSchema', () => {
  it('accepts valid event payload', () => {
    const result = eventFormSchema.safeParse({
      title: 'Integral',
      subject_id: '00000000-0000-4000-8000-000000000020',
      start_at: '2026-05-19T10:00',
      end_at: '2026-05-19T11:00',
      method: 'pomodoro',
      status: 'planned',
    })
    expect(result.success).toBe(true)
  })

  it('rejects end before start', () => {
    const result = eventFormSchema.safeParse({
      title: 'Bad',
      start_at: '2026-05-19T12:00',
      end_at: '2026-05-19T10:00',
      method: 'pomodoro',
      status: 'planned',
    })
    expect(result.success).toBe(false)
  })
})
