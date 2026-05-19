import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api/errors'
import i18n from '@/shared/i18n'
import { translateApiError } from '@/shared/i18n'

function ErrorMessage({ error }: { error: ApiError }) {
  return <p>{translateApiError(error.code, error.message)}</p>
}

describe('errors i18n', () => {
  it('renders VALIDATION_ERROR in Turkish', async () => {
    await i18n.changeLanguage('tr')
    const error = new ApiError(400, {
      error: { code: 'VALIDATION_ERROR', message: 'fallback' },
    })

    render(
      <I18nextProvider i18n={i18n}>
        <ErrorMessage error={error} />
      </I18nextProvider>,
    )

    expect(screen.getByText('Girdiğiniz bilgileri kontrol edin')).toBeInTheDocument()
  })
})
