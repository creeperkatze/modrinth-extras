import { type Colord, colord } from 'colord'

import type { ThemeColors } from '../../core/settings'

export const rgba = (color: Colord, alpha: number) => color.alpha(alpha).toRgbString()

export function mix(color: Colord, base: number, amount: number) {
	const { r, g, b } = color.toRgb()
	const channel = (c: number) => Math.round(c * amount + base * (1 - amount))
	return colord({ r: channel(r), g: channel(g), b: channel(b) })
}

// The variables Modrinth derives from its brand green that are the same on every base
export function accentVariables(accent: string): Record<string, string> {
	const color = colord(accent)
	return {
		'--color-brand': accent,
		'--color-brand-highlight': rgba(color, 0.25),
		'--color-brand-shadow': rgba(color, 0.7),
		'--color-green': accent,
		'--color-green-highlight': rgba(color, 0.25),
		'--loading-bar-gradient': `linear-gradient(to right, ${accent} 0%, ${rgba(color, 0.5)} 100%)`,
	}
}

// Modrinth tints the green background more on dark bases
export function accentBackground(accent: string, base: ThemeColors['base']): string {
	return rgba(colord(accent), base === 'dark' ? 0.2 : 0.1)
}
