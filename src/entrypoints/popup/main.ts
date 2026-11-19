import '../../assets/popup-tailwind.css'
import '../../assets/popup.scss'

import { installTooltipDirective, TooltipDirective } from '@modrinth/ui'
import { createApp, h } from 'vue'

import { installI18n, loadSavedLocale } from '../../core/i18n/i18n'
import { installErrorReporting, reportUncaughtErrors } from '../../core/telemetry'
import {
	applyThemeClass,
	readModrinthTheme,
	systemTheme,
} from '../../features/themes/website-theme'
import App from './App.vue'

reportUncaughtErrors()

// The device theme shows right away, Modrinth's own theme follows once its cookie is read
applyThemeClass(systemTheme())
const syncTheme = () => readModrinthTheme().then(applyThemeClass)
void syncTheme()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => void syncTheme())

void (async () => {
	await loadSavedLocale()

	const app = createApp({
		render: () => [h(App), h(TooltipDirective)],
	})

	installErrorReporting(app)
	installI18n(app)
	installTooltipDirective(app)
	app.mount('#app')
})()
