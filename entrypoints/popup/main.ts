import { provideI18n } from '@modrinth/ui'
import { createApp, h, ref } from 'vue'
import '../../assets/popup.scss'
import '../../assets/tailwind.css'
import App from './App.vue'

// Apply the correct theme class to <html> synchronously so CSS custom
// properties from variables.scss are resolved before Vue renders anything.
function applyTheme(dark: boolean)
{
	document.documentElement.classList.toggle('dark-mode', dark)
	document.documentElement.classList.toggle('light-mode', !dark)
}
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
applyTheme(darkQuery.matches)
darkQuery.addEventListener('change', (e) => applyTheme(e.matches))

const app = createApp({
	setup()
	{
		provideI18n({ locale: ref('en-US'), t: (key: string) => key, setLocale: () => { } })
	},
	render: () => h(App),
})

app.mount('#app')

