import { expect, test } from './fixtures'

test.describe('popup', () => {
	test.beforeEach(async ({ page, extensionId }) => {
		await page.goto(`chrome-extension://${extensionId}/popup.html`)
		await page.waitForSelector('.scrollable-pane-wrapper', { timeout: 5_000 })
	})

	test('renders header with logo and Modrinth link', async ({ page }) => {
		await expect(page.getByRole('img', { name: 'Modrinth Extras' })).toBeVisible()
		await expect(page.getByRole('link', { name: /modrinth/i }).first()).toBeVisible()
	})

	test('renders all three feature groups', async ({ page }) => {
		const groupLabel = page.locator('p.uppercase')
		await expect(groupLabel.getByText('General', { exact: true })).toBeVisible()
		await expect(groupLabel.getByText('Content Pages', { exact: true })).toBeVisible()
		await expect(groupLabel.getByText('Extension', { exact: true })).toBeVisible()
	})

	test('renders feature toggle rows', async ({ page }) => {
		const title = page.locator('div.text-sm.font-semibold')
		await expect(title.getByText('Notifications', { exact: true })).toBeVisible()
		await expect(title.getByText('Quick search', { exact: true })).toBeVisible()
		await expect(title.getByText('Activity sparkline', { exact: true })).toBeVisible()
		await expect(title.getByText('Notification badge', { exact: true })).toBeVisible()
	})

	test('footer shows version number', async ({ page }) => {
		await expect(page.locator('text=/^v\\d+\\.\\d+\\.\\d+/')).toBeVisible()
	})

	test('language dropdown is present', async ({ page }) => {
		await expect(
			page.locator('div.text-sm.font-semibold').getByText('Language', { exact: true }),
		).toBeVisible()
		await expect(page.locator('.language-dropdown')).toBeVisible()
	})
})
