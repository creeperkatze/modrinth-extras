import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	reporter: 'list',
	retries: 3,
	use: {
		headless: true,
	},
	workers: 2,
})
