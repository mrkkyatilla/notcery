import { describe, expect, it } from 'vitest'

import { migrateNoteContent, needsTipTapMigration } from '@/features/notes/tiptap-to-markdown'

describe('tiptap-to-markdown', () => {
  it('detects migration when markdown empty and tiptap has content', () => {
    expect(
      needsTipTapMigration('', {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
      }),
    ).toBe(true)
  })

  it('skips migration when markdown exists', () => {
    expect(needsTipTapMigration('# Hi', { type: 'doc', content: [] })).toBe(false)
  })

  it('converts simple paragraph to markdown', () => {
    const md = migrateNoteContent('', {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Kuantum notlari' }],
        },
      ],
    })
    expect(md).toContain('Kuantum')
  })
})
