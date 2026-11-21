import { colord } from 'colord'

import type { ExtensionSettings, NamedTheme, ThemeColors } from '../../core/settings'
import { fileSlug } from '../../utils/download'
import { setThemeAccent } from '../accent-color/apply'
import { accentBackground, accentVariables } from '../accent-color/variables'
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

// The same variables Modrinth's own themes set, except the accent, which the accent color feature
// paints across the whole page. Each color also gets the tints Modrinth derives from it per base.
function paletteVariables(theme: ThemeColors): Record<string, string> {
	const [surface1, surface15, surface2, surface25, surface3, surface4, surface5] = theme.surfaces
	const bgAlpha = theme.base === 'dark' ? 0.2 : 0.1
	const colors = Object.entries(theme.colors).flatMap(([name, color]) => [
		[`--color-${name}`, color],
		[`--color-${name}-highlight`, rgba(color, 0.25)],
		[`--color-${name}-bg`, rgba(color, bgAlpha)],
	])
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
		'--color-accent-contrast': theme.accentContrast,
		...Object.fromEntries(colors),
	}
}

const LANDING_IMAGES = 'https://cdn.modrinth.com/landing-new'

// The home page hardcodes its own backgrounds and maze images per base, so they follow the theme's
// page background instead. The maze images get a layer of it on top, which SHARED_RULES blends in.
function landingVariables(theme: ThemeColors): Record<string, string> {
	const [surface1, , surface2, , surface3, surface4] = theme.surfaces
	const dark = theme.base === 'dark'
	const tint = `linear-gradient(${surface1}, ${surface1})`
	const [hero, lower] = dark
		? ['landing.webp', 'landing-lower.webp']
		: ['landing-light.webp', 'landing-lower-light.webp']
	const border = theme.text.tertiary
	return {
		'--landing-raw-bg': surface1,
		'--landing-maze-bg': `${tint}, url('${LANDING_IMAGES}/${hero}')`,
		'--landing-maze-gradient-bg': `${tint}, url('${LANDING_IMAGES}/${lower}')`,
		'--landing-maze-outer-bg': surface1,
		'--landing-transition-gradient-start': rgba(surface1, 0),
		'--landing-transition-gradient-end': surface1,
		'--landing-creator-gradient': `linear-gradient(180deg, ${surface1} 0%, ${surface2} 100%)`,
		'--landing-hover-card-gradient': `radial-gradient(50% 50% at 50% 50%, ${surface4} 0%, ${rgba(surface2, 0.77)} 100%)`,
		'--landing-blob-gradient': `radial-gradient(50% 50% at 50% 50%, ${rgba(surface4, 0.35)} 0%, ${rgba(surface3, 0.27)} 100%)`,
		'--landing-blob-shadow': `2px 2px 12px rgba(0, 0, 0, 0.16), inset 2px 2px 64px ${rgba(surface4, 0.45)}`,
		'--landing-card-bg': rgba(surface4, dark ? 0.15 : 0.8),
		'--landing-border-color': rgba(border, 0.55),
		'--landing-border-gradient': `linear-gradient(to bottom right, ${rgba(border, 0.75)} 0%, ${rgba(border, dark ? 0.18 : 0.34)} 100%)`,
		'--landing-color-heading': theme.text.primary,
		'--landing-color-subheading': theme.text.default,
		'--medal-promotion-bg': surface1,
	}
}

// Modrinth's modal backdrop is a fixed dark teal, so it takes the page background's hue instead.
// It keeps Modrinth's lightness and opacity, so it stays dark on light themes too.
function overlayVariables(theme: ThemeColors): Record<string, string> {
	const { h, s } = colord(theme.surfaces[0]).toHsl()
	const shade = (l: number, alpha: number) => colord({ h, s, l }).alpha(alpha).toRgbString()
	return {
		'--modrinth-extras-modal-overlay': `linear-gradient(to bottom, ${shade(15, 0.52)} 0%, ${shade(8, 0.95)} 100%)`,
	}
}

// Multiplying tints the near white light images, but would turn the dark ones black, so those
// take only the tint's hue and keep their own shading
const SHARED_RULES = `html:root.light-mode[${THEME_ATTRIBUTE}] :is(.landing-hero, .users-section) {
	background-blend-mode: multiply;
}
html:root.dark-mode[${THEME_ATTRIBUTE}] :is(.landing-hero, .users-section) {
	background-blend-mode: color;
}
html:root[${THEME_ATTRIBUTE}] .modal-overlay.standard {
	background: var(--modrinth-extras-modal-overlay);
}`

// Previews aren't painted by the accent color feature, so they carry the accent themselves
export function themeVariables(theme: ThemeColors): Record<string, string> {
	return {
		...paletteVariables(theme),
		...accentVariables(theme.accent),
		'--color-green-bg': accentBackground(theme.accent, theme.base),
	}
}

function declarations(variables: Record<string, string>): string {
	return Object.entries(variables)
		.map(([name, value]) => `\n\t${name}: ${value};`)
		.join('')
}

// CSS.escape keeps a theme id from breaking out of the selector
function themeRules(theme: NamedTheme): string {
	const id = CSS.escape(theme.id)
	return `html:root[${THEME_ATTRIBUTE}='${id}'] {${declarations({ ...paletteVariables(theme), ...landingVariables(theme), ...overlayVariables(theme) })}
}
.${THEME_PREVIEW_CLASS}[${THEME_ATTRIBUTE}='${id}'] {${declarations(themeVariables(theme))}
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
	if (!presets.textContent) {
		presets.textContent = [SHARED_RULES, ...PRESET_THEMES.map(themeRules)].join('\n')
	}
	styleElement(CUSTOM_STYLE_ID).textContent = customThemes.map(themeRules).join('\n')

	const themes = showPresets ? [...PRESET_THEMES, ...customThemes] : customThemes
	const theme = themes.find((candidate) => candidate.id === id)
	if (theme) document.documentElement.setAttribute(THEME_ATTRIBUTE, id)
	else document.documentElement.removeAttribute(THEME_ATTRIBUTE)
	setBase(theme?.base ?? null)
	setThemeAccent(theme?.accent ?? null)
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
	return `${fileSlug(name, 'theme')}.json`
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
