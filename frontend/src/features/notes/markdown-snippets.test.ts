import { describe, expect, it } from 'vitest'

import { insertSnippet, MARKDOWN_SNIPPETS } from '@/features/notes/markdown-snippets'

describe('insertSnippet', () => {
  it('inserts mermaid block at cursor', () => {
    const { value, cursor } = insertSnippet('Hello', 5, MARKDOWN_SNIPPETS.mermaid)
    expect(value).toContain('```mermaid')
    expect(value.startsWith('Hello')).toBe(true)
    expect(cursor).toBeGreaterThan(5)
  })
})
