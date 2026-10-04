import { defineSiteConfig, readMessages } from './shared/config'

export default defineSiteConfig(
	{
		title: 'Modrinth Extras',
		url: 'https://modrinth-extras.creeperkatze.dev',
		repo: 'creeperkatze/modrinth-extras',
		version: process.env.VERSION,
		messages: readMessages(new URL('../src/locales', import.meta.url)),
		nav: (t) => [
			{
				text: t('nav.translate'),
				link: 'https://crowdin.com/project/modrinth-extras',
				target: '_blank',
			},
		],
		footerLinks: (t, prefix) => [{ text: t('footer.privacy'), link: `${prefix}/privacy` }],
		socialLinks: [{ icon: 'discord', link: 'https://link.creeperkatze.dev/discord' }],
	},
	{
		themeConfig: {
			logo: '/icon.svg',
			siteTitle: false,
		},
		// Stops Vite from picking up the extension's Tailwind PostCSS config in the repo root
		vite: { css: { postcss: {} } },
	},
)
