import { type Colord, colord } from 'colord'

import type { ExtensionSettings } from '../../core/settings'
import { setImageAccent } from './images'
import { accentBackground, accentVariables, mix, rgba } from './variables'

const STYLE_ID = 'modrinth-extras-accent-color'

// These are defined per theme upstream, so they need theme-scoped rules
function themeStyles(accent: string, color: Colord) {
	return `
html:root {
	--color-green-bg: ${accentBackground(accent, 'light')};
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(color, 0.175)} 0%, ${rgba(color, 0.125)} 100%);
	--brand-gradient-border: ${rgba(mix(color, 0, 0.3), 0.15)};
	--landing-green-label: ${rgba(mix(color, 0, 0.78), 1)};
	--landing-green-label-bg: ${rgba(color, 0.15)};
}
html:root:not(.retro-mode) {
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(color, 0.175)} 0%, ${rgba(color, 0.12)} 100%);
}
html:root:is(.dark-mode, .oled-mode, .retro-mode) {
	--color-green-bg: ${accentBackground(accent, 'dark')};
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(mix(color, 0, 0.16), 0.2)} 0%, ${rgba(mix(color, 0, 0.63), 0.1)} 100%);
	--brand-gradient-border: ${rgba(mix(color, 255, 0.5), 0.08)};
	--landing-green-label: ${rgba(color, 1)};
}
html:root.dark-mode {
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(mix(color, 8, 0.04), 1)} 10%, ${rgba(mix(color, 18, 0.06), 1)} 100%);
}
html:root.oled-mode {
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(mix(color, 0, 0.3), 0.15)} 0%, ${rgba(mix(color, 0, 0.63), 0.1)} 100%);
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(mix(color, 8, 0.04), 0.6)} 10%, ${rgba(mix(color, 18, 0.06), 0.5)} 100%);
}
`
}

// Some landing and hosting page elements hardcode the brand green
function hardcodedOverrides(color: Colord) {
	return `
.blob-demonstration::after {
	background: linear-gradient(0deg, ${rgba(color, 1)} 0%, ${rgba(color, 0)} 100%) !important;
}
[style*="27, 217, 106, 0.23"] {
	background-image: radial-gradient(86.12% 101.64% at 95.97% 94.07%, ${rgba(color, 0.23)} 0%, ${rgba(mix(color, 0, 0.53), 0.2)} 100%) !important;
}
[style*="12, 107, 52, 0.55"] {
	border-color: ${rgba(mix(color, 0, 0.49), 0.55)} !important;
}
[style*="27, 217, 106, 0.13"] {
	box-shadow: 0px 12px 38.1px ${rgba(color, 0.13)} !important;
}
`
}

// The rest is set inline, so it wins over every theme's own rules
let inlineNames: string[] = []

function paint(accent: string | null) {
	const root = document.documentElement.style
	for (const name of inlineNames) root.removeProperty(name)
	inlineNames = []
	setImageAccent(accent)
	if (!accent) {
		document.getElementById(STYLE_ID)?.remove()
		return
	}
	for (const [name, value] of Object.entries(accentVariables(accent))) {
		root.setProperty(name, value)
		inlineNames.push(name)
	}
	let style = document.getElementById(STYLE_ID)
	if (!style) {
		style = document.createElement('style')
		style.id = STYLE_ID
		document.head.append(style)
	}
	const color = colord(accent)
	style.textContent = themeStyles(accent, color) + hardcodedOverrides(color)
}

// A custom accent color wins over the active theme's own accent
const sources: Record<'custom' | 'theme', string | null> = { custom: null, theme: null }
let painted: string | null = null

function setAccent(source: keyof typeof sources, accent: string | null) {
	sources[source] = accent
	const next = sources.custom ?? sources.theme
	if (next === painted) return
	painted = next
	paint(next)
}

export function applyAccentColor(settings: Pick<ExtensionSettings, 'accentColor'>) {
	const { enabled, color } = settings.accentColor
	setAccent('custom', enabled && colord(color).isValid() ? color : null)
}

export function setThemeAccent(accent: string | null) {
	setAccent('theme', accent)
}
