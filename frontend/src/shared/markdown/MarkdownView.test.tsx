import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarkdownView } from '@/shared/markdown/MarkdownView'

describe('MarkdownView', () => {
  it('renders GFM table and checklist', () => {
    render(
      <MarkdownView
        variant="note"
        content={'| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] Done'}
      />,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders callout blockquote', () => {
    render(
      <MarkdownView variant="chat" content={'> [!NOTE]\n> Important'} />,
    )
    expect(screen.getByText(/Important/)).toBeInTheDocument()
  })
})
