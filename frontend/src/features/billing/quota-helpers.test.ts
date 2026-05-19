import { describe, expect, it } from 'vitest'

import {
  chatQuotaRemaining,
  planQuotaRemaining,
} from '@/features/billing/quota-helpers'

describe('quota-helpers', () => {
  it('parses plan quota from billing summary', () => {
    const result = planQuotaRemaining({
      limits: { plan_generate_per_week: 3 } as never,
      usage: { plan_generate_this_week: 2 } as never,
    })
    expect(result).toEqual({ used: 2, limit: 3 })
  })

  it('parses chat quota from billing summary', () => {
    const result = chatQuotaRemaining({
      limits: { chat_messages_per_day: 20 } as never,
      usage: { chat_messages_today: 5 } as never,
    })
    expect(result).toEqual({ used: 5, limit: 20 })
  })
})
