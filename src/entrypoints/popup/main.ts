import '../../assets/popup-tailwind.css'
import '../../assets/popup.scss'
import 'floating-vue/dist/style.css'

import FloatingVue from 'floating-vue'
import { createApp, h } from 'vue'

import { installI18n, loadSavedLocale } from '../../utils/i18n'
import App from './App.vue'

function applyTheme(dark: boolean) {
	document.documentElement.classList.toggle('dark-mode', dark)
	document.documentElement.classList.toggle('light-mode', !dark)
}
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
applyTheme(darkQuery.matches)
darkQuery.addEventListener('change', (e) => applyTheme(e.matches))

await loadSavedLocale()

const app = createApp({
	render: () => h(App),
})

installI18n(app)
app.use(FloatingVue)
app.mount('#app')
