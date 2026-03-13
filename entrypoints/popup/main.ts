import { createApp, h, ref } from 'vue'
import { provideI18n } from '@modrinth/ui'
import App from './App.vue'
import '../../assets/popup.css'
import '../../assets/tailwind.css'

const app = createApp({
	setup() {
		provideI18n({ locale: ref('en-US'), t: (key: string) => key, setLocale: () => {} })
	},
	render: () => h(App),
})

app.mount('#app')
