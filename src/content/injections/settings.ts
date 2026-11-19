import ExtraThemeOptions from '../../components/settings/ExtraThemeOptions.vue'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'

const EXTRA_THEMES_ID = 'modrinth-extras-extra-themes'

export function settingsInjections(settings: SettingsGetter) {
	const extraThemes = createInjection({
		id: EXTRA_THEMES_ID,
		isEnabled: () => settings().extraThemes.enabled,
		settingsKeys: ['extraThemes'],
		persistent: false,
		attach(container) {
			const grid = document.querySelector<HTMLElement>('.theme-options')
			if (!grid) return false
			// The sections go below the website's own themes
			grid.after(container)
			return true
		},
		createApp: () =>
			createExtensionApp(ExtraThemeOptions, {
				savedSelected: settings().themes.selected,
				savedCustom: settings().themes.custom,
			}),
	})

	return [extraThemes]
}
