import type { ExtensionSettings } from '../../core/settings'
import { hexToRgb } from '../../utils/color'

type Rgb = [number, number, number]

const STYLE_ID = 'modrinth-extras-accent-color'

const rgba = ([r, g, b]: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`

function mix(rgb: Rgb, base: number, amount: number): Rgb {
	return rgb.map((c) => Math.round(c * amount + base * (1 - amount))) as Rgb
}

// The brand gradients are defined per theme upstream, so they need theme-scoped rules
function gradientStyles(rgb: Rgb) {
	return `
html:root {
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(rgb, 0.175)} 0%, ${rgba(rgb, 0.125)} 100%);
	--brand-gradient-border: ${rgba(mix(rgb, 0, 0.3), 0.15)};
	--landing-green-label: ${rgba(mix(rgb, 0, 0.78), 1)};
	--landing-green-label-bg: ${rgba(rgb, 0.15)};
}
html:root:not(.retro-mode) {
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(rgb, 0.175)} 0%, ${rgba(rgb, 0.12)} 100%);
}
html:root:is(.dark-mode, .oled-mode, .retro-mode) {
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(mix(rgb, 0, 0.16), 0.2)} 0%, ${rgba(mix(rgb, 0, 0.63), 0.1)} 100%);
	--brand-gradient-border: ${rgba(mix(rgb, 255, 0.5), 0.08)};
	--landing-green-label: ${rgba(rgb, 1)};
}
html:root.dark-mode {
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(mix(rgb, 8, 0.04), 1)} 10%, ${rgba(mix(rgb, 18, 0.06), 1)} 100%);
}
html:root.oled-mode {
	--brand-gradient-bg: linear-gradient(0deg, ${rgba(mix(rgb, 0, 0.3), 0.15)} 0%, ${rgba(mix(rgb, 0, 0.63), 0.1)} 100%);
	--brand-gradient-strong-bg: linear-gradient(270deg, ${rgba(mix(rgb, 8, 0.04), 0.6)} 10%, ${rgba(mix(rgb, 18, 0.06), 0.5)} 100%);
}
`
}

// Some landing and hosting page elements hardcode the brand green
function hardcodedOverrides(rgb: Rgb) {
	return `
.blob-demonstration::after {
	background: linear-gradient(0deg, ${rgba(rgb, 1)} 0%, ${rgba(rgb, 0)} 100%) !important;
}
[style*="27, 217, 106, 0.23"] {
	background-image: radial-gradient(86.12% 101.64% at 95.97% 94.07%, ${rgba(rgb, 0.23)} 0%, ${rgba(mix(rgb, 0, 0.53), 0.2)} 100%) !important;
}
[style*="12, 107, 52, 0.55"] {
	border-color: ${rgba(mix(rgb, 0, 0.49), 0.55)} !important;
}
[style*="27, 217, 106, 0.13"] {
	box-shadow: 0px 12px 38.1px ${rgba(rgb, 0.13)} !important;
}
`
}

export function applyAccentColor(settings: Pick<ExtensionSettings, 'accentColor'>) {
	const root = document.documentElement.style
	const rgb = settings.accentColor.enabled ? hexToRgb(settings.accentColor.color) : null

	if (!rgb) {
		root.removeProperty('--color-brand')
		root.removeProperty('--color-brand-highlight')
		root.removeProperty('--color-brand-shadow')
		root.removeProperty('--color-green')
		root.removeProperty('--color-green-highlight')
		root.removeProperty('--color-green-bg')
		root.removeProperty('--loading-bar-gradient')
		document.getElementById(STYLE_ID)?.remove()
		return
	}

	const [r, g, b] = rgb
	root.setProperty('--color-brand', settings.accentColor.color)
	root.setProperty('--color-brand-highlight', `rgba(${r}, ${g}, ${b}, 0.25)`)
	root.setProperty('--color-brand-shadow', `rgba(${r}, ${g}, ${b}, 0.7)`)
	root.setProperty('--color-green', settings.accentColor.color)
	root.setProperty('--color-green-highlight', `rgba(${r}, ${g}, ${b}, 0.25)`)
	root.setProperty('--color-green-bg', `rgba(${r}, ${g}, ${b}, 0.1)`)
	root.setProperty(
		'--loading-bar-gradient',
		`linear-gradient(to right, ${settings.accentColor.color} 0%, rgba(${r}, ${g}, ${b}, 0.5) 100%)`,
	)

	let style = document.getElementById(STYLE_ID)
	if (!style) {
		style = document.createElement('style')
		style.id = STYLE_ID
		document.head.append(style)
	}
	style.textContent = gradientStyles(rgb) + hardcodedOverrides(rgb)
}
