import { colord } from 'colord'

import type { ExtensionSettings, NamedTheme, ThemeColors } from '../../core/settings'
import { PRESET_THEMES } from './presets'

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
	return `html:root[${THEME_ATTRIBUTE}='${id}'],
.${THEME_PREVIEW_CLASS}[${THEME_ATTRIBUTE}='${id}'] {${declarations}
}`
}

const MODE_CLASSES = ['light-mode', 'dark-mode', 'oled-mode', 'retro-mode']

// Modrinth's styles are built on the root element's theme class, so an active theme swaps in its
// own base there without touching the website's saved theme, and puts the website's class back after
let activeBase: ThemeColors['base'] | null = null
let addedBaseClass = false
let websiteClass: string | null = null
let classObserver: MutationObserver | null = null

function enforceBase() {
	if (!activeBase) return
	const root = document.documentElement
	const baseClass = `${activeBase}-mode`
	for (const name of MODE_CLASSES) {
		if (name === baseClass || !root.classList.contains(name)) continue
		websiteClass = name
		root.classList.remove(name)
	}
	if (!root.classList.contains(baseClass)) {
		root.classList.add(baseClass)
		addedBaseClass = true
	}
}

function releaseBase() {
	classObserver?.disconnect()
	classObserver = null
	const root = document.documentElement
	if (activeBase && addedBaseClass) root.classList.remove(`${activeBase}-mode`)
	if (websiteClass) root.classList.add(websiteClass)
	activeBase = null
	addedBaseClass = false
	websiteClass = null
}

function setBase(base: ThemeColors['base'] | null) {
	if (base === activeBase) return
	releaseBase()
	if (!base) return
	activeBase = base
	enforceBase()
	// The website rewrites the class when its own theme changes, so ours is put back each time
	classObserver = new MutationObserver(enforceBase)
	classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
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

// Every custom theme gets a rule, so the picker can preview all of them
export function applyTheme(id: string, customThemes: NamedTheme[], showPresets: boolean) {
	const presets = styleElement(STYLE_ID)
	if (!presets.textContent) presets.textContent = PRESET_THEMES.map(themeRule).join('\n')
	styleElement(CUSTOM_STYLE_ID).textContent = customThemes.map(themeRule).join('\n')

	const themes = showPresets ? [...PRESET_THEMES, ...customThemes] : customThemes
	const theme = themes.find((candidate) => candidate.id === id)
	if (theme) document.documentElement.setAttribute(THEME_ATTRIBUTE, id)
	else document.documentElement.removeAttribute(THEME_ATTRIBUTE)
	setBase(theme?.base ?? null)
}

export function applyThemeSettings(settings: Pick<ExtensionSettings, 'themes' | 'themeLibrary'>) {
	const { selected, custom } = settings.themeLibrary
	const { enabled, presets } = settings.themes
	applyTheme(enabled ? selected : '', custom, presets)
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

// Raised when the file layout changes, so older files can be recognised and converted
export const THEME_FILE_VERSION = 1

export function exportThemeFile(theme: NamedTheme): string {
	const { id: _id, ...colors } = theme
	return JSON.stringify({ version: THEME_FILE_VERSION, ...colors }, null, '\t')
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

export type ThemeImportResult = { theme: NamedTheme } | { error: 'invalid' | 'newer' }

// Imported files are checked field by field, so a broken one can't break the page
export function importThemeFile(contents: string, fallbackName: string): ThemeImportResult {
	let value: Partial<Record<keyof NamedTheme | 'version', unknown>>
	try {
		value = JSON.parse(contents)
	} catch {
		return { error: 'invalid' }
	}
	if (typeof value !== 'object' || value === null) return { error: 'invalid' }
	const { version } = value
	if (typeof version !== 'number' || !Number.isInteger(version)) return { error: 'invalid' }
	if (version > THEME_FILE_VERSION) return { error: 'newer' }

	const { name, base, surfaces, text, divider, accent, accentContrast, colors } = value
	if (base !== 'light' && base !== 'dark') return { error: 'invalid' }
	if (!Array.isArray(surfaces) || surfaces.length !== 7 || !surfaces.every(isColor)) {
		return { error: 'invalid' }
	}
	if (!hasColors(text, ['primary', 'default', 'tertiary'] as const)) return { error: 'invalid' }
	if (!hasColors(colors, ['red', 'orange', 'blue', 'purple'] as const)) {
		return { error: 'invalid' }
	}
	if (!isColor(divider) || !isColor(accent) || !isColor(accentContrast)) {
		return { error: 'invalid' }
	}
	const fileName = typeof name === 'string' && name.trim() ? name.trim() : fallbackName
	const theme = createCustomTheme(fileName, {
		base,
		surfaces: surfaces as ThemeColors['surfaces'],
		text: { primary: text.primary, default: text.default, tertiary: text.tertiary },
		divider,
		accent,
		accentContrast,
		colors: { red: colors.red, orange: colors.orange, blue: colors.blue, purple: colors.purple },
	})
	return { theme }
}
