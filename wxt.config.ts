import { createRequire } from 'node:module'

import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

const { version } = createRequire(import.meta.url)('./package.json')

export default defineConfig({
	srcDir: 'src',
	publicDir: 'src/public',
	modules: ['@wxt-dev/module-vue'],
	manifest: {
		name: 'Modrinth Extras',
		description: 'Adds unofficial extra features to the Modrinth website.',
		version,
		icons: {
			16: '/icon-16.png',
			32: '/icon-32.png',
			48: '/icon-48.png',
			128: '/icon-128.png',
		},
		permissions: ['cookies', 'storage', 'alarms', 'notifications', 'tabs'],
		host_permissions: ['https://modrinth.com/*', 'https://api.modrinth.com/*'],

		browser_specific_settings: {
			gecko: {
				id: 'contact@creeperkatze.de',
				// @ts-expect-error -- data_collection_permissions is a Firefox-specific field not yet in WXT types
				data_collection_permissions: {
					required: ['none'],
					optional: [],
				},
			},
		},
	},
	zip: {
		artifactTemplate: 'modrinth-extras-{{version}}-{{browser}}.zip',
		sourcesTemplate: 'modrinth-extras-{{version}}-sources.zip',
	},
	vite: () => ({
		plugins: [
			svgLoader({
				svgoConfig: {
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									removeViewBox: false,
									cleanupIds: false,
								},
							},
						},
					],
				},
			}),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		] as any,
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: ['import'],
				},
			},
		},
		build: {
			chunkSizeWarningLimit: 2000,
			rolldownOptions: {
				onwarn(warning, warn) {
					if (warning.code === 'EMPTY_IMPORT_META') return
					warn(warning)
				},
			},
		},
	}),
})
