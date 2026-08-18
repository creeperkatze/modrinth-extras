import { createRequire } from 'node:module'

import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'vitepress'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

const title = 'Modrinth Extras'
const description = 'A browser extension that enhances Modrinth on the website and beyond.'
const url = 'https://modrinth-extras.creeperkatze.dev'
const image = `${url}/banner.png`

export default defineConfig({
	title,
	description,
	cleanUrls: true,
	head: [
		['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
		['meta', { property: 'og:type', content: 'website' }],
		['meta', { property: 'og:url', content: url }],
		['meta', { property: 'og:title', content: title }],
		['meta', { property: 'og:description', content: description }],
		['meta', { property: 'og:image', content: image }],
		['meta', { name: 'twitter:card', content: 'summary_large_image' }],
		['meta', { name: 'twitter:title', content: title }],
		['meta', { name: 'twitter:description', content: description }],
		['meta', { name: 'twitter:image', content: image }],
	],
	vite: {
		plugins: [svgLoader()],
	},
	themeConfig: {
		logo: '/icon.svg',
		siteTitle: false,
		nav: [
			{ text: 'Translate', link: 'https://crowdin.com/project/modrinth-extras', target: '_blank' },
			{ text: `v${version}`, link: 'https://github.com/creeperkatze/modrinth-extras/releases' },
		],
		socialLinks: [
			{ icon: 'github', link: 'https://github.com/creeperkatze/modrinth-extras' },
			{ icon: 'discord', link: 'https://link.creeperkatze.dev/discord' },
		],
	},
})
