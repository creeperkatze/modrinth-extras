import { defineSyncedList } from '../../core/synced-list'

export interface ThemeColors {
	base: 'light' | 'dark'
	surfaces: [string, string, string, string, string, string, string]
	text: { primary: string; default: string; tertiary: string }
	divider: string
	accent: string
	accentContrast: string
	// Green follows the accent, since Modrinth uses green as its brand color
	colors: { red: string; orange: string; blue: string; purple: string }
}

export interface NamedTheme extends ThemeColors {
	id: string
	name: string
}

export const MAX_CUSTOM_THEMES = 100

// The selected id can also be a preset
export const themeLibrary = defineSyncedList<NamedTheme>('themeLibrary')
