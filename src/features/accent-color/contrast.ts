import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'

extend([a11yPlugin])

export type AccentColorIssue = 'background' | 'buttonText'

interface ThemeColors {
	surface: string
	buttonText: string
}

// Modrinth's default theme
const DARK: ThemeColors = { surface: '#27292e', buttonText: '#000000' }

// Modrinth's raised surface and the text it puts on brand buttons, per theme
const THEMES: Record<string, ThemeColors> = {
	light: { surface: '#f8f8f8', buttonText: '#ffffff' },
	dark: DARK,
	oled: { surface: '#101013', buttonText: '#000000' },
	retro: { surface: '#232421', buttonText: '#ffffff' },
}

// Modrinth's own light theme green only reaches about 2.7
const MIN_CONTRAST = 2.5

export function accentColorIssue(color: string, theme: string): AccentColorIssue | null {
	const accent = colord(color)
	if (!accent.isValid()) return null
	const { surface, buttonText } = THEMES[theme] ?? DARK
	if (accent.contrast(surface) < MIN_CONTRAST) return 'background'
	if (accent.contrast(buttonText) < MIN_CONTRAST) return 'buttonText'
	return null
}
