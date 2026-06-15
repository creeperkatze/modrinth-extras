import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

const { version } = createRequire(import.meta.url)('./package.json')

export default defineConfig({
	srcDir: 'src',
	publicDir: 'src/public',
	outDir: '.output',
	modules: ['@wxt-dev/module-vue'],
	manifest: {
		name: '__MSG_extName__',
		description: '__MSG_extDescription__',
		default_locale: 'en_US',
		version,
		icons: {
			16: '/icon-16.png',
			32: '/icon-32.png',
			48: '/icon-48.png',
			128: '/icon-128.png',
		},
		permissions: ['cookies', 'storage', 'alarms'],
		optional_permissions: ['notifications'],
		host_permissions: [
			'https://modrinth.com/*',
			'https://api.modrinth.com/*',
			'https://www.curseforge.com/*',
		],

		browser_specific_settings: {
			gecko: {
				id: 'contact@creeperkatze.de',
				data_collection_permissions: {
					required: ['none'],
					optional: ['technicalAndInteraction'],
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
		resolve: {
			alias: {
				'@stripe/stripe-js': fileURLToPath(new URL('./src/mocks/stripe-js.ts', import.meta.url)),
			},
		},
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
				checks: {
					pluginTimings: false,
				},
				external: (id: string) => id.startsWith('@xterm/'),
				onwarn(warning, warn) {
					if (warning.code === 'EMPTY_IMPORT_META') return
					if (warning.code === 'EVAL' && warning.id?.includes('ace-builds')) return
					warn(warning)
				},
			},
		},
	}),
})
