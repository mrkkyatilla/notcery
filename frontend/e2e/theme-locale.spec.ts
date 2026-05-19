import { expect, test } from '@playwright/test'

test.describe('Theme and locale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-posta|email/i).fill('theme@notcery.app')
    await page.getByLabel(/^şifre$|^password$/i).fill('password123')
    await page.getByRole('button', { name: /giriş yap|sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('dark theme applies html.dark class', async ({ page }) => {
    await page.goto('/settings/profile')
    await page.locator('#theme').selectOption('dark')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('API requests include Accept-Language after locale change', async ({ page }) => {
    await page.goto('/settings/profile')

    const patchWithEn = page.waitForRequest(
      (req) =>
        req.method() === 'PATCH' &&
        req.url().includes('/users/me') &&
        req.headers()['accept-language'] === 'en',
      { timeout: 5000 },
    )

    await page.locator('#locale').selectOption('en')
    await patchWithEn
  })
})
