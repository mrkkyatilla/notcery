import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { useTheme } from '@/shared/theme/use-theme'

function ThemeProbe() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  it('applies dark class when theme is dark', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })
})
