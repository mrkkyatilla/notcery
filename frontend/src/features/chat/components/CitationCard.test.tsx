import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { CitationCard } from '@/features/chat/components/CitationCard'
import '@/shared/i18n'

describe('CitationCard', () => {
  it('renders note citation with link', () => {
    render(
      <MemoryRouter>
        <CitationCard
          workspaceId="00000000-0000-4000-8000-000000000010"
          citation={{
            type: 'chunk',
            chunk_id: 'c1',
            source_type: 'note',
            note_id: '00000000-0000-4000-8000-000000000099',
            excerpt: 'Integral kuralları…',
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Integral kuralları/)).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toContain('/notes/')
  })
})
