import { readMessages } from '../.vitepress/shared/config'

// One home page per translation in src/locales. English is the root page.
export default {
	paths: () =>
		Object.keys(readMessages(new URL('../src/locales', import.meta.url)))
			.filter((lang) => lang !== 'en-US')
			.map((locale) => ({ params: { locale } })),
}
