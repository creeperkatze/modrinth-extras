import ThemeOptions from '../../components/settings/ThemeOptions.vue'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'

const THEME_OPTIONS_ID = 'modrinth-extras-theme-options'

export function settingsInjections(settings: SettingsGetter) {
	const themeOptions = createInjection({
		id: THEME_OPTIONS_ID,
		isEnabled: () => settings().themes.enabled,
		persistent: false,
		attach(container) {
			const grid = document.querySelector<HTMLElement>('.theme-options')
			if (!grid) return false
			// The sections go below the website's own themes
			grid.after(container)
			return true
		},
		createApp: () => createExtensionApp(ThemeOptions),
	})

	return [themeOptions]
}
