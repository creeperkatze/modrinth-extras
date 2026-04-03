import { type BrowserContext, chromium, test as base } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.join(dirname, '..', '.output', 'test', 'chrome-mv3')

export const test = base.extend<{
	context: BrowserContext
	extensionId: string
}>({
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use) => {
		const context = await chromium.launchPersistentContext('', {
			channel: 'chromium',
			args: [
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		})
		await use(context)
		await context.close()
	},
	extensionId: async ({ context }, use) => {
		let [serviceWorker] = context.serviceWorkers()
		if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker')

		const extensionId = serviceWorker.url().split('/')[2]
		await use(extensionId)
	},
})

export const expect = test.expect
