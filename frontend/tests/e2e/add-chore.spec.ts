import { test, expect } from '@playwright/test'

test('adding a chore shows it in the chores list', async ({ page }) => {
  const description = `E2E add-chore ${Date.now()}`

  await page.goto('/add-chore')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Value (dollars)').fill('5.00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Chore saved successfully.')).toBeVisible()

  await page.getByRole('link', { name: 'Chores' }).click()
  await expect(page).toHaveURL(/\/chores/)
  await expect(page.getByRole('row', { name: new RegExp(description) })).toBeVisible()
})
