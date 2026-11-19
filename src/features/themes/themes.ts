import { colord } from 'colord'

import type { ExtensionSettings, NamedTheme, ThemeColors } from '../../core/settings'

export const EXTRA_THEMES: NamedTheme[] = [
	{
		id: 'catppuccin-mocha',
		name: 'Catppuccin Mocha',
		base: 'dark',
		surfaces: ['#11111b', '#151520', '#181825', '#1b1b29', '#1e1e2e', '#313244', '#45475a'],
		text: { primary: '#cdd6f4', default: '#bac2de', tertiary: '#a6adc8' },
		divider: '#6c7086',
		accent: '#cba6f7',
		accentContrast: '#11111b',
		colors: { red: '#f38ba8', orange: '#fab387', blue: '#89b4fa', purple: '#cba6f7' },
	},
	{
		id: 'catppuccin-latte',
		name: 'Catppuccin Latte',
		base: 'light',
		surfaces: ['#dce0e8', '#e0e3eb', '#e6e9ef', '#e9ecf2', '#eff1f5', '#f6f7f9', '#ccd0da'],
		text: { primary: '#4c4f69', default: '#5c5f77', tertiary: '#6c6f85' },
		divider: '#acb0be',
		accent: '#8839ef',
		accentContrast: '#ffffff',
		colors: { red: '#d20f39', orange: '#fe640b', blue: '#1e66f5', purple: '#8839ef' },
	},
	{
		id: 'dracula',
		name: 'Dracula',
		base: 'dark',
		surfaces: ['#191a21', '#1e1f28', '#21222c', '#252632', '#282a36', '#343746', '#44475a'],
		text: { primary: '#f8f8f2', default: '#cfcfc9', tertiary: '#8b93b8' },
		divider: '#6272a4',
		accent: '#bd93f9',
		accentContrast: '#282a36',
		colors: { red: '#ff5555', orange: '#ffb86c', blue: '#8be9fd', purple: '#bd93f9' },
	},
	{
		id: 'gruvbox-dark',
		name: 'Gruvbox Dark',
		base: 'dark',
		surfaces: ['#1d2021', '#202324', '#232627', '#262829', '#282828', '#3c3836', '#504945'],
		text: { primary: '#fbf1c7', default: '#ebdbb2', tertiary: '#a89984' },
		divider: '#665c54',
		accent: '#fabd2f',
		accentContrast: '#282828',
		colors: { red: '#fb4934', orange: '#fe8019', blue: '#83a598', purple: '#d3869b' },
	},
	{
		id: 'rose-pine',
		name: 'Rosé Pine',
		base: 'dark',
		surfaces: ['#13111c', '#16141f', '#191724', '#1c1a28', '#1f1d2e', '#26233a', '#403d52'],
		text: { primary: '#e0def4', default: '#cfcce4', tertiary: '#908caa' },
		divider: '#524f67',
		accent: '#ebbcba',
		accentContrast: '#191724',
		colors: { red: '#eb6f92', orange: '#f6c177', blue: '#9ccfd8', purple: '#c4a7e7' },
	},
	{
		id: 'rose-pine-dawn',
		name: 'Rosé Pine Dawn',
		base: 'light',
		surfaces: ['#f2e9e1', '#f4ede8', '#f7f0ea', '#f8f2ec', '#faf4ed', '#fffaf3', '#dfdad9'],
		text: { primary: '#464261', default: '#575279', tertiary: '#797593' },
		divider: '#cecacd',
		accent: '#b4637a',
		accentContrast: '#ffffff',
		colors: { red: '#b4637a', orange: '#ea9d34', blue: '#56949f', purple: '#907aa9' },
	},
	{
		id: 'solarized-dark',
		name: 'Solarized Dark',
		base: 'dark',
		surfaces: ['#00212b', '#002631', '#002b36', '#03303c', '#073642', '#0f4350', '#1f5361'],
		text: { primary: '#eee8d5', default: '#93a1a1', tertiary: '#839496' },
		divider: '#586e75',
		accent: '#2aa198',
		accentContrast: '#002b36',
		colors: { red: '#dc322f', orange: '#cb4b16', blue: '#268bd2', purple: '#6c71c4' },
	},
	{
		id: 'solarized-light',
		name: 'Solarized Light',
		base: 'light',
		surfaces: ['#eee8d5', '#f1ebd9', '#f5efdc', '#f7f1df', '#fdf6e3', '#fffbf0', '#e4dcc5'],
		text: { primary: '#073642', default: '#586e75', tertiary: '#657b83' },
		divider: '#93a1a1',
		accent: '#2aa198',
		accentContrast: '#fdf6e3',
		colors: { red: '#dc322f', orange: '#cb4b16', blue: '#268bd2', purple: '#6c71c4' },
	},
]

// Modrinth's own themes, as starting points for custom themes
export const MODRINTH_THEMES: NamedTheme[] = [
	{
		id: 'modrinth-dark',
		name: 'Modrinth Dark',
		base: 'dark',
		surfaces: ['#16181c', '#1a1c20', '#1d1f23', '#222429', '#27292e', '#34363c', '#42444a'],
		text: { primary: '#ffffff', default: '#b0bac5', tertiary: '#96a2b0' },
		divider: '#646c75',
		accent: '#1bd96a',
		accentContrast: '#000000',
		colors: { red: '#ff496e', orange: '#ffa347', blue: '#4f9cff', purple: '#c78aff' },
	},
	{
		id: 'modrinth-light',
		name: 'Modrinth Light',
		base: 'light',
		surfaces: ['#ebebeb', '#ededed', '#f5f5f5', '#eef1f5', '#f8f8f8', '#ffffff', '#dddddd'],
		text: { primary: '#1a202c', default: '#2c2e31', tertiary: '#484d54' },
		divider: '#dddddd',
		accent: '#00af5c',
		accentContrast: '#ffffff',
		colors: { red: '#cb2245', orange: '#e08325', blue: '#1f68c0', purple: '#8e32f3' },
	},
]

// An attribute, since the website rewrites the root element's classes when its theme changes
export const THEME_ATTRIBUTE = 'data-modrinth-extras-theme'
// Gives a picker preview the theme's colors without the theme being active
export const THEME_PREVIEW_CLASS = 'modrinth-extras-theme-preview'

const STYLE_ID = 'modrinth-extras-themes'
const CUSTOM_STYLE_ID = 'modrinth-extras-custom-themes'

function rgba(color: string, alpha: number): string {
	return colord(color).alpha(alpha).toRgbString()
}

// The same variables Modrinth's own themes set. A custom accent color is set inline, so it still wins.
// Each color also gets the tints Modrinth derives from it, with its own opacities per base.
export function themeVariables(theme: ThemeColors): Record<string, string> {
	const [surface1, surface15, surface2, surface25, surface3, surface4, surface5] = theme.surfaces
	const bgAlpha = theme.base === 'dark' ? 0.2 : 0.1
	const colors = Object.entries({ ...theme.colors, green: theme.accent }).flatMap(
		([name, color]) => [
			[`--color-${name}`, color],
			[`--color-${name}-highlight`, rgba(color, 0.25)],
			[`--color-${name}-bg`, rgba(color, bgAlpha)],
		],
	)
	return {
		'--surface-1': surface1,
		'--surface-1-5': surface15,
		'--surface-2': surface2,
		'--surface-2-5': surface25,
		'--surface-3': surface3,
		'--surface-4': surface4,
		'--surface-5': surface5,
		'--color-text-primary': theme.text.primary,
		'--color-text-default': theme.text.default,
		'--color-text-tertiary': theme.text.tertiary,
		'--color-divider-dark': theme.divider,
		'--color-gradient-button-bg': `linear-gradient(180deg, ${surface4} 0%, ${surface5} 100%)`,
		'--color-brand': theme.accent,
		'--color-brand-highlight': rgba(theme.accent, 0.25),
		'--color-brand-shadow': rgba(theme.accent, 0.7),
		'--color-accent-contrast': theme.accentContrast,
		'--loading-bar-gradient': `linear-gradient(to right, ${theme.accent} 0%, ${rgba(theme.accent, 0.5)} 100%)`,
		...Object.fromEntries(colors),
	}
}

// CSS.escape keeps a theme id from breaking out of the selector
function themeRule(theme: NamedTheme): string {
	const id = CSS.escape(theme.id)
	const declarations = Object.entries(themeVariables(theme))
		.map(([name, value]) => `\n\t${name}: ${value};`)
		.join('')
	return `html:root.${theme.base}-mode[${THEME_ATTRIBUTE}='${id}'],
.${THEME_PREVIEW_CLASS}[${THEME_ATTRIBUTE}='${id}'] {${declarations}
}`
}

function styleElement(id: string): HTMLStyleElement {
	let style = document.getElementById(id) as HTMLStyleElement | null
	if (!style) {
		style = document.createElement('style')
		style.id = id
		document.head.append(style)
	}
	return style
}

// Only shows while the website itself is on the theme's base, light or dark.
// Every custom theme gets a rule, so the picker can preview all of them.
export function applyExtraTheme(id: string, customThemes: NamedTheme[]) {
	const presets = styleElement(STYLE_ID)
	if (!presets.textContent) presets.textContent = EXTRA_THEMES.map(themeRule).join('\n')
	styleElement(CUSTOM_STYLE_ID).textContent = customThemes.map(themeRule).join('\n')

	const known = [...EXTRA_THEMES, ...customThemes].some((theme) => theme.id === id)
	if (known) document.documentElement.setAttribute(THEME_ATTRIBUTE, id)
	else document.documentElement.removeAttribute(THEME_ATTRIBUTE)
}

export function applyThemeSettings(settings: Pick<ExtensionSettings, 'extraThemes' | 'themes'>) {
	const { selected, custom } = settings.themes
	applyExtraTheme(settings.extraThemes.enabled ? selected : '', custom)
}

export function createCustomTheme(name: string, colors: ThemeColors): NamedTheme {
	return { ...structuredClone(colors), id: `custom-${crypto.randomUUID()}`, name }
}

// "Example theme" is saved as example-theme.json
export function themeFileName(name: string): string {
	const slug = name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return `${slug || 'theme'}.json`
}

export function exportThemeFile(theme: NamedTheme): string {
	const { id: _id, ...file } = theme
	return JSON.stringify(file, null, '\t')
}

function isColor(value: unknown): value is string {
	return typeof value === 'string' && colord(value).isValid()
}

function hasColors<K extends string>(
	value: unknown,
	keys: readonly K[],
): value is Record<K, string> {
	return (
		typeof value === 'object' &&
		value !== null &&
		keys.every((key) => isColor((value as Record<string, unknown>)[key]))
	)
}

// Imported files are checked field by field, so a broken one can't break the page
export function importThemeFile(contents: string, fallbackName: string): NamedTheme | null {
	let value: Partial<Record<keyof NamedTheme, unknown>>
	try {
		value = JSON.parse(contents)
	} catch {
		return null
	}
	if (typeof value !== 'object' || value === null) return null
	const { name, base, surfaces, text, divider, accent, accentContrast, colors } = value
	if (base !== 'light' && base !== 'dark') return null
	if (!Array.isArray(surfaces) || surfaces.length !== 7 || !surfaces.every(isColor)) return null
	if (!hasColors(text, ['primary', 'default', 'tertiary'] as const)) return null
	if (!hasColors(colors, ['red', 'orange', 'blue', 'purple'] as const)) return null
	if (!isColor(divider) || !isColor(accent) || !isColor(accentContrast)) return null
	return createCustomTheme(typeof name === 'string' && name.trim() ? name.trim() : fallbackName, {
		base,
		surfaces: surfaces as ThemeColors['surfaces'],
		text: { primary: text.primary, default: text.default, tertiary: text.tertiary },
		divider,
		accent,
		accentContrast,
		colors: { red: colors.red, orange: colors.orange, blue: colors.blue, purple: colors.purple },
	})
}
