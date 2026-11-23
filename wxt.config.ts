import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

import { SEARCH_RESULT_ORIGINS } from './src/features/curseforge-integration/search-hosts'

const { version } = createRequire(import.meta.url)('./package.json')

const IMAGE_FILE = /\.(png|webp|jpe?g|gif|avif|svg)$/i

// Vite emits imported images even if the code using them is tree-shaken
function dropUnusedImages(): Plugin {
	return {
		name: 'modrinth-extras:drop-unused-images',
		apply: 'build',
		enforce: 'post',
		generateBundle(_, bundle) {
			const outputs = Object.values(bundle).flatMap((file) =>
				file.type === 'chunk' ? [file.code] : typeof file.source === 'string' ? [file.source] : [],
			)
			for (const [fileName, file] of Object.entries(bundle)) {
				if (file.type !== 'asset' || !IMAGE_FILE.test(fileName)) continue
				const name = path.basename(fileName)
				if (!outputs.some((output) => output.includes(name))) delete bundle[fileName]
			}
		},
	}
}

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
		permissions: ['cookies', 'storage', 'alarms', 'activeTab', 'scripting'],
		optional_permissions: ['notifications'],
		host_permissions: [
			'https://modrinth.com/*',
			'https://api.modrinth.com/*',
			'https://www.curseforge.com/*',
		],
		// Search engines are asked for only when the integration is turned on
		optional_host_permissions: [...SEARCH_RESULT_ORIGINS],

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
			dropUnusedImages(),
		],
		resolve: {
			alias: {
				'@stripe/stripe-js/pure': fileURLToPath(
					new URL('./src/mocks/stripe-js.ts', import.meta.url),
				),
				'@intercom/messenger-js-sdk': fileURLToPath(
					new URL('./src/mocks/intercom.ts', import.meta.url),
				),
				'./language-settings-coverage.generated': fileURLToPath(
					new URL('./src/mocks/language-settings-coverage.ts', import.meta.url),
				),
			},
		},
	}),
})
