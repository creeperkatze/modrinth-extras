import { expect, test } from './fixtures'

test('extension service worker starts', async ({ extensionId }) => {
	expect(extensionId).toMatch(/^[a-z]{32}$/)
})

test('popup page loads', async ({ page, extensionId }) => {
	await page.goto(`chrome-extension://${extensionId}/popup.html`)
	await expect(page.locator('body')).not.toBeEmpty()
	await expect(page.locator('#app')).toBeAttached()
})
