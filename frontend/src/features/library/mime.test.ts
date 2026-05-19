import { describe, expect, it } from 'vitest'

import { MAX_UPLOAD_BYTES, validateUploadFile } from '@/features/library/mime'

describe('validateUploadFile', () => {
  it('accepts pdf by extension', () => {
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' })
    expect(validateUploadFile(file)).toEqual({ ok: true, mimeType: 'application/pdf' })
  })

  it('rejects oversize files', () => {
    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES + 1 })
    expect(validateUploadFile(file)).toEqual({ ok: false, code: 'size' })
  })

  it('rejects unsupported extension', () => {
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    expect(validateUploadFile(file)).toEqual({ ok: false, code: 'unsupported' })
  })

  it('rejects mime mismatch', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'text/plain' })
    expect(validateUploadFile(file)).toEqual({ ok: false, code: 'mime_mismatch' })
  })
})
