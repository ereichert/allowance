import { test, expect } from '@playwright/test'

// Relies on the dev database containing at least two people: there is no
// POST /people endpoint yet, so people cannot be created from the UI or API.
test('a chore assigned to two people shows an M badge whose popup lists both names', async ({
  page,
}) => {
  const description = `E2E assignees ${Date.now()}`

  await page.goto('/add-chore')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Value (dollars)').fill('1.00')

  const assigneeOptions = page.locator('.add-chore-form__assignees-list label')
  await expect(assigneeOptions.first()).toBeVisible()
  const names = (await assigneeOptions.allTextContents()).map((name) => name.trim())
  expect(names.length).toBeGreaterThanOrEqual(2)

  const [firstAssignee, secondAssignee] = names
  await page.getByRole('checkbox', { name: firstAssignee, exact: true }).check()
  await page.getByRole('checkbox', { name: secondAssignee, exact: true }).check()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Chore saved successfully.')).toBeVisible()

  await page.getByRole('link', { name: 'Chores' }).click()
  await expect(page).toHaveURL(/\/chores/)

  const row = page.getByRole('row', { name: new RegExp(description) })
  await expect(row).toBeVisible()
  const indicator = row.getByLabel('Assignees: 2')
  await expect(indicator).toHaveText('M')

  await indicator.hover()
  const popup = page.getByRole('tooltip')
  await expect(popup).toBeVisible()
  const sortedNames = [firstAssignee, secondAssignee].sort((a, b) => a.localeCompare(b))
  await expect(popup.getByRole('listitem')).toHaveText(sortedNames)
})
