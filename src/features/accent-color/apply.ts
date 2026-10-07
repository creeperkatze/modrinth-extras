import { type Colord, colord } from 'colord'

import type { ExtensionSettings } from '../../core/settings'
import { setImageAccent } from './images'

const STYLE_ID = 'modrinth-extras-accent-color'

const rgba = (color: Colord, alpha: number) => color.alpha(alpha).toRgbString()

function mix(color: Colord, base: number, amount: number) {
	const { r, g, b } = color.toRgb()
	const channel = (c: number) => Math.round(c * amount + base * (1 - amount))
	return colord({ r: channel(r), g: channel(g), b: channel(b) })
}

// The brand gradients are defined per theme upstream, so they need theme-scoped rules
function gradientStyles(color: Colord) {
	return `
html:root {
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(color, 0.175)} 0%, ${rgba(color, 0.125)} 100%);
	--brand-gradient-border: ${rgba(mix(color, 0, 0.3), 0.15)};
	--landing-green-label: ${rgba(mix(color, 0, 0.78), 1)};
	--landing-green-label-bg: ${rgba(color, 0.15)};
}
html:root:not(.retro-mode) {
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(color, 0.175)} 0%, ${rgba(color, 0.12)} 100%);
}
html:root:is(.dark-mode, .oled-mode, .retro-mode) {
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

export function applyAccentColor(settings: Pick<ExtensionSettings, 'accentColor'>) {
	const root = document.documentElement.style
	const color = colord(settings.accentColor.color)

	if (!settings.accentColor.enabled || !color.isValid()) {
		root.removeProperty('--color-brand')
		root.removeProperty('--color-brand-highlight')
		root.removeProperty('--color-brand-shadow')
		root.removeProperty('--color-green')
		root.removeProperty('--color-green-highlight')
		root.removeProperty('--color-green-bg')
		root.removeProperty('--loading-bar-gradient')
		document.getElementById(STYLE_ID)?.remove()
		setImageAccent(null)
		return
	}

	root.setProperty('--color-brand', settings.accentColor.color)
	root.setProperty('--color-brand-highlight', rgba(color, 0.25))
	root.setProperty('--color-brand-shadow', rgba(color, 0.7))
	root.setProperty('--color-green', settings.accentColor.color)
	root.setProperty('--color-green-highlight', rgba(color, 0.25))
	root.setProperty('--color-green-bg', rgba(color, 0.1))
	root.setProperty(
		'--loading-bar-gradient',
		`linear-gradient(to right, ${settings.accentColor.color} 0%, ${rgba(color, 0.5)} 100%)`,
	)

	let style = document.getElementById(STYLE_ID)
	if (!style) {
		style = document.createElement('style')
		style.id = STYLE_ID
		document.head.append(style)
	}
	style.textContent = gradientStyles(color) + hardcodedOverrides(color)
	setImageAccent(settings.accentColor.color)
}
