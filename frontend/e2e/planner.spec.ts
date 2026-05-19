import { expect, test } from '@playwright/test'

test.describe('Planner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/e-posta|email/i).fill('planner@notcery.app')
    await page.getByLabel(/şifre|password/i).fill('password123')
    await page.getByRole('button', { name: /giriş|sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('opens planner and shows AI generate control', async ({ page }) => {
    await page.getByRole('link', { name: /planlayıcı|planner/i }).click()
    await expect(page).toHaveURL(/\/planner/)
    await expect(page.getByRole('button', { name: /ai plan/i })).toBeVisible()
  })
})
