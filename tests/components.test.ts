import { expect, test } from './fixtures'

const WEBSITE_BASE_URL = 'http://localhost:3000'

test.describe('components', () => {
	test('injects error notice on error pages', async ({ page }) => {
		await page.goto(`${WEBSITE_BASE_URL}/this-does-not-exist-xyzzy-404`)

		await page.waitForSelector('.error-box', { timeout: 20_000 })

		await page.waitForSelector('#modrinth-extras-error-notice', { timeout: 10_000 })

		await expect(page.locator('#modrinth-extras-error-notice')).toContainText('Modrinth Extras')
	})

	test('injects footer badge', async ({ page }) => {
		await page.goto(`${WEBSITE_BASE_URL}`)

		await page.waitForSelector('#modrinth-extras-footer-badge', { timeout: 20_000 })

		await expect(page.locator('#modrinth-extras-footer-badge')).toContainText('Modrinth Extras')
	})

	test('injects quick search container into body', async ({ page }) => {
		await page.goto(`${WEBSITE_BASE_URL}`)

		await page.waitForSelector('#modrinth-extras-quick-search', {
			state: 'attached',
			timeout: 20_000,
		})

		await expect(page.locator('#modrinth-extras-quick-search')).toBeAttached()
		await expect(page.locator('.qs-panel')).not.toBeAttached()
	})

	test('opens quick search panel on Ctrl+K', async ({ page }) => {
		await page.goto(`${WEBSITE_BASE_URL}`)
		await page.waitForSelector('#modrinth-extras-quick-search', {
			state: 'attached',
			timeout: 20_000,
		})

		await page.keyboard.press('Control+k')

		await expect(page.locator('.qs-panel')).toBeVisible({ timeout: 3_000 })

		await expect(page.locator('.qs-panel input')).toBeFocused()
	})

	test('injects project card actions on browse pages', async ({ page }) => {
		await page.goto(`${WEBSITE_BASE_URL}/discover/mods`)

		await page.waitForSelector('.project-card-container', { timeout: 20_000 })

		await page.waitForSelector('.project-card-container button:has-text("Download")', {
			timeout: 10_000,
		})

		await expect(
			page.locator('.project-card-container button').filter({ hasText: 'Download' }).first(),
		).toBeVisible()
	})

	test('does not show error notice on valid pages under repeated hard reloads', async ({
		page,
	}) => {
		test.setTimeout(120_000)

		await page.goto(`${WEBSITE_BASE_URL}/mod/iris`)

		for (let i = 0; i < 3; i++) {
			await page.reload({ waitUntil: 'commit' })
			await page.waitForTimeout(2_000)
		}

		await page.waitForSelector('#modrinth-extras-tools-sidebar', {
			state: 'attached',
			timeout: 30_000,
		})
		await page.waitForTimeout(5_000)
		await expect(page.locator('#modrinth-extras-error-notice')).not.toBeAttached()
	})

	test.describe('project pages', () => {
		test.beforeEach(async ({ page }) => {
			await page.goto(`${WEBSITE_BASE_URL}/mod/iris`)

			await page.waitForSelector('#modrinth-extras-tools-sidebar', {
				state: 'attached',
				timeout: 20_000,
			})
		})

		test('injects tools sidebar', async ({ page }) => {
			await expect(page.locator('#modrinth-extras-tools-sidebar h2')).toContainText('Tools')
		})

		test('injects dependency sidebar', async ({ page }) => {
			await page.waitForSelector('#modrinth-extras-dependency-sidebar', { timeout: 5_000 })

			await expect(page.locator('#modrinth-extras-dependency-sidebar h2')).toContainText(
				'Dependencies',
			)
		})

		test('injects activity sparkline', async ({ page }) => {
			await page.waitForSelector('#modrinth-extras-activity-sparkline', { timeout: 5_000 })

			await expect(page.locator('#modrinth-extras-activity-sparkline')).toBeAttached()
		})

		test('injects github sidebar', async ({ page }) => {
			await page.waitForSelector('#modrinth-extras-github-sidebar', {
				state: 'attached',
				timeout: 5_000,
			})
			await expect(page.locator('#modrinth-extras-github-sidebar')).toBeAttached()

			await expect(page.locator('#modrinth-extras-github-sidebar h2')).toContainText('GitHub', {
				timeout: 10_000,
			})
		})

		test('injects discord sidebar', async ({ page }) => {
			await page.waitForSelector('#modrinth-extras-discord-sidebar', {
				state: 'attached',
				timeout: 5_000,
			})
			await expect(page.locator('#modrinth-extras-discord-sidebar')).toBeAttached()

			await expect(page.locator('#modrinth-extras-discord-sidebar h2')).toContainText('Discord', {
				timeout: 10_000,
			})
		})

		test('injects gallery background', async ({ page }) => {
			await page.waitForSelector('#modrinth-extras-gallery-background', { timeout: 5_000 })
			await expect(page.locator('#modrinth-extras-gallery-background')).toBeAttached()
		})
	})
})
