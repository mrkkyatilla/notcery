import type { components } from '@/shared/api/schema'

export type ErrorEnvelope = components['schemas']['ErrorEnvelope']
export type ApiErrorCode = ErrorEnvelope['error']['code']

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly details: Record<string, unknown> | undefined

  constructor(
    status: number,
    payload: ErrorEnvelope,
  ) {
    super(payload.error.message)
    this.name = 'ApiError'
    this.code = payload.error.code
    this.status = status
    this.details = payload.error.details as Record<string, unknown> | undefined
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== 'object') return false
  const envelope = value as ErrorEnvelope
  return (
    typeof envelope.error?.code === 'string' &&
    typeof envelope.error?.message === 'string'
  )
}

export async function parseApiError(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return new ApiError(response.status, {
      error: {
        code: 'VALIDATION_ERROR',
        message: response.statusText || 'Request failed',
      },
    })
  }

  if (isErrorEnvelope(body)) {
    return new ApiError(response.status, body)
  }

  return new ApiError(response.status, {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Unexpected error response',
      details: typeof body === 'object' ? (body as Record<string, unknown>) : undefined,
    },
  })
}
