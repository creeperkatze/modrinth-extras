import type { ThemeColors } from '../../core/settings'
import { rgba } from '../../utils/color'

// The variables Modrinth derives from its brand green that are the same on every base
export function accentVariables(accent: string): Record<string, string> {
	return {
		'--color-brand': accent,
		'--color-brand-highlight': rgba(accent, 0.25),
		'--color-brand-shadow': rgba(accent, 0.7),
		'--color-green': accent,
		'--color-green-highlight': rgba(accent, 0.25),
		'--loading-bar-gradient': `linear-gradient(to right, ${accent} 0%, ${rgba(accent, 0.5)} 100%)`,
	}
}

// Modrinth tints the green background more on dark bases
export function accentBackground(accent: string, base: ThemeColors['base']): string {
	return rgba(accent, base === 'dark' ? 0.2 : 0.1)
}
