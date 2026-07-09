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

test('a keyboard user can open the detail panel without a mouse', async ({ page }) => {
  const description = `E2E keyboard panel ${Date.now()}`

  await page.goto('/add-chore')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Value (dollars)').fill('3.00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Chore saved successfully.')).toBeVisible()

  await page.getByRole('link', { name: 'Chores' }).click()
  await expect(page).toHaveURL(/\/chores/)

  const row = page.getByRole('row', { name: new RegExp(description) })
  await expect(row).toBeVisible()
  await row.focus()
  await page.keyboard.press('Enter')

  const panel = page.getByRole('dialog', { name: 'Chore details' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText(description)
})

test('a keyboard user can open and close the detail panel with arrow keys', async ({ page }) => {
  const description = `E2E arrow key panel ${Date.now()}`

  await page.goto('/add-chore')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Value (dollars)').fill('4.00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Chore saved successfully.')).toBeVisible()

  await page.getByRole('link', { name: 'Chores' }).click()
  await expect(page).toHaveURL(/\/chores/)

  const row = page.getByRole('row', { name: new RegExp(description) })
  await expect(row).toBeVisible()
  await row.focus()
  await page.keyboard.press('ArrowRight')

  const panel = page.getByRole('dialog', { name: 'Chore details' })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText(description)

  await page.keyboard.press('ArrowLeft')
  await expect(panel).not.toBeVisible()
})
