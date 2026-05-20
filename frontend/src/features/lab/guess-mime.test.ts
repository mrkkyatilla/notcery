import { describe, expect, it } from 'vitest'

import { guessLabMimeFromFilename } from '@/features/lab/guess-mime'

describe('guessLabMimeFromFilename', () => {
  it('uses extension for .tsx even when browser reports video/mp2t', () => {
    expect(guessLabMimeFromFilename('App.tsx', 'video/mp2t')).toBe('text/plain')
  })

  it('uses extension for .py when browser reports empty octet-stream', () => {
    expect(guessLabMimeFromFilename('main.py', 'application/octet-stream')).toBe('text/plain')
  })
})
