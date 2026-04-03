import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	retries: 3,
	use: {
		headless: true,
	},
	workers: 2,
})
