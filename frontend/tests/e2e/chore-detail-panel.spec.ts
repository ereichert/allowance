import { test, expect } from '@playwright/test'

test('clicking a chore row opens its detail panel, closable by button or Escape', async ({
  page,
}) => {
  const description = `E2E detail panel ${Date.now()}`

  await page.goto('/add-chore')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Value (dollars)').fill('2.50')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Chore saved successfully.')).toBeVisible()

  await page.getByRole('link', { name: 'Chores' }).click()
  await expect(page).toHaveURL(/\/chores/)

  const row = page.getByRole('row', { name: new RegExp(description) })
  await expect(row).toBeVisible()
  await row.click()

  const panel = page.getByRole('dialog', { name: 'Chore details' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText(description)
  await expect(panel).toContainText('$2.50')

  await page.getByRole('button', { name: /close/i }).click()
  await expect(panel).not.toBeVisible()

  await row.click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).not.toBeVisible()
})
