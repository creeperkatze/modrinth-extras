import '../../assets/popup-tailwind.css'
import '../../assets/popup.scss'

import { installTooltipDirective, TooltipDirective } from '@modrinth/ui'
import { createApp, h } from 'vue'

import { installI18n, loadSavedLocale } from '../../core/i18n/i18n'
import App from './App.vue'

function applyTheme(dark: boolean) {
	document.documentElement.classList.toggle('dark-mode', dark)
	document.documentElement.classList.toggle('light-mode', !dark)
}
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
applyTheme(darkQuery.matches)
darkQuery.addEventListener('change', (e) => applyTheme(e.matches))

void (async () => {
	await loadSavedLocale()

	const app = createApp({
		render: () => [h(App), h(TooltipDirective)],
	})

	installI18n(app)
	installTooltipDirective(app)
	app.mount('#app')
})()
