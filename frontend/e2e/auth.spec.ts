import { expect, test } from '@playwright/test'

test.describe('Auth flow (MSW)', () => {
  test('login reaches dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-posta|email/i).fill('e2e@notcery.app')
    await page.getByLabel(/^şifre$|^password$/i).fill('password123')
    await page.getByRole('button', { name: /giriş yap|sign in|log in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /panel|dashboard/i })).toBeVisible()
  })

  test('register → onboarding → dashboard', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel(/görünen ad|display name/i).fill('E2E User')
    await page.getByLabel(/e-posta|email/i).fill(`e2e-${Date.now()}@notcery.app`)
    await page.getByLabel(/^şifre$|^password$/i).fill('Password123!')
    await page.getByRole('button', { name: /kayıt ol|register|sign up/i }).click()

    await expect(page).toHaveURL(/\/onboarding/)

    await page.getByRole('button', { name: /devam/i }).click()
    await page.locator('#workspace').fill('E2E Workspace')
    await page.getByRole('button', { name: /devam/i }).click()
    await page.locator('#subject').fill('Mathematics')
    await page.getByRole('button', { name: /başla|finish/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
  })
})
