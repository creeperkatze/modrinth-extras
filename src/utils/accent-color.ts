import { hexToRgb } from './color'
import type { ExtensionSettings } from './settings'

export function applyAccentColor(settings: Pick<ExtensionSettings, 'accentColor'>) {
	const root = document.documentElement.style
	const rgb = settings.accentColor.enabled ? hexToRgb(settings.accentColor.color) : null

	if (!rgb) {
		root.removeProperty('--color-brand')
		root.removeProperty('--color-brand-highlight')
		root.removeProperty('--color-brand-shadow')
		root.removeProperty('--color-green')
		root.removeProperty('--color-green-highlight')
		return
	}

	const [r, g, b] = rgb
	root.setProperty('--color-brand', settings.accentColor.color)
	root.setProperty('--color-brand-highlight', `rgba(${r}, ${g}, ${b}, 0.25)`)
	root.setProperty('--color-brand-shadow', `rgba(${r}, ${g}, ${b}, 0.7)`)
	root.setProperty('--color-green', settings.accentColor.color)
	root.setProperty('--color-green-highlight', `rgba(${r}, ${g}, ${b}, 0.25)`)
}
