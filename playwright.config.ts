import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	reporter: 'list',
	use: {
		headless: true,
	},
	workers: 2,
	webServer: {
		command: 'pnpm dev',
		cwd: './modrinth/apps/frontend',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
		timeout: 120_000,
		env: {
			BASE_URL: 'https://api.modrinth.com/v2/',
			BROWSER_BASE_URL: 'https://api.modrinth.com/v2/',
			PROD_OVERRIDE: 'true',
		},
	},
})
