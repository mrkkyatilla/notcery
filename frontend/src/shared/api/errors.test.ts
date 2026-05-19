import { describe, expect, it } from 'vitest'

import { ApiError, isErrorEnvelope } from '@/shared/api/errors'

describe('ApiError', () => {
  it('parses error envelope codes', () => {
    const err = new ApiError(403, {
      error: {
        code: 'FORBIDDEN',
        message: 'Denied',
        details: { reason: 'test' },
      },
    })

    expect(err.code).toBe('FORBIDDEN')
    expect(err.status).toBe(403)
    expect(err.details).toEqual({ reason: 'test' })
  })

  it('validates error envelope shape', () => {
    expect(
      isErrorEnvelope({
        error: { code: 'UNAUTHORIZED', message: 'x' },
      }),
    ).toBe(true)
    expect(isErrorEnvelope({ message: 'x' })).toBe(false)
  })
})
