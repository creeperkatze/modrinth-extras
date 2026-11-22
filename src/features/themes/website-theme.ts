import { browser } from 'wxt/browser'

export type ModrinthTheme = 'light' | 'dark' | 'oled' | 'retro'

const THEMES: ModrinthTheme[] = ['light', 'dark', 'oled', 'retro']

function isTheme(value: unknown): value is ModrinthTheme {
	return THEMES.includes(value as ModrinthTheme)
}

export function systemTheme(): ModrinthTheme {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// The color-mode cookie holds the theme or "system". Dark then means the last used dark theme.
export async function readModrinthTheme(): Promise<ModrinthTheme> {
	try {
		const cookie = await browser.cookies.get({ url: 'https://modrinth.com', name: 'color-mode' })
		if (!cookie?.value) return systemTheme()
		const settings = JSON.parse(decodeURIComponent(cookie.value)) as {
			preference?: unknown
			value?: unknown
		}
		if (isTheme(settings.preference)) return settings.preference
		if (systemTheme() === 'light') return 'light'
		return isTheme(settings.value) && settings.value !== 'light' ? settings.value : 'dark'
	} catch (err) {
		console.error('[Modrinth Extras] Failed to read Modrinth theme:', err)
		return systemTheme()
	}
}

// The same classes the website puts on its root element, which Modrinth's styles are built on
export function applyThemeClass(theme: ModrinthTheme) {
	for (const name of THEMES) {
		document.documentElement.classList.toggle(`${name}-mode`, name === theme)
	}
}
