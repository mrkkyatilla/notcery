import { describe, expect, it } from 'vitest'

import {
  pollIntervalMs,
  shouldPollTask,
  taskStatusToPhase,
} from '@/features/ai-plan/task-poll'

describe('task poll state machine', () => {
  it('maps pending to polling', () => {
    expect(taskStatusToPhase('pending')).toBe('polling')
    expect(shouldPollTask('polling')).toBe(true)
    expect(pollIntervalMs('polling')).toBe(2000)
  })

  it('stops polling on terminal states', () => {
    expect(taskStatusToPhase('success')).toBe('success')
    expect(taskStatusToPhase('failed')).toBe('failed')
    expect(pollIntervalMs('success')).toBe(false)
    expect(pollIntervalMs('failed')).toBe(false)
  })
})
