import { detectBrowserLocale, i18n } from '../core/i18n/i18n'
import { followSettingsChanges, loadSettingsStore, useSettings } from '../core/settings-store'
import { hideModrinthButton, showModrinthButton } from '../features/curseforge-integration/button'
import { findModrinthUrl } from '../features/curseforge-integration/match'
import { parsePlatformPage } from '../features/platforms/pages'

let lookupAttempt = 0

async function updateModrinthButton(): Promise<void> {
	const attempt = ++lookupAttempt
	const pageUrl = window.location.href
	hideModrinthButton()

	const settings = await loadSettingsStore()
	if (attempt !== lookupAttempt || !settings.curseforgeIntegration.enabled) return

	const page = parsePlatformPage(pageUrl)
	if (page?.platform !== 'curseforge') return

	const url = await findModrinthUrl(page)
	if (attempt !== lookupAttempt || window.location.href !== pageUrl || !url) return

	console.log(`[Modrinth Extras] CurseForge integration: Matched ${page.slug} to ${url}`)
	showModrinthButton(url)
}

export default defineContentScript({
	matches: ['https://www.curseforge.com/*'],
	cssInjectionMode: 'manual',
	runAt: 'document_idle',

	main(ctx) {
		console.log('[Modrinth Extras] CurseForge integration: content script loaded')
		const settings = useSettings()
		const applyLocale = () => {
			i18n.global.locale.value = settings.locale.value || detectBrowserLocale()
		}
		void loadSettingsStore().then(applyLocale)
		const stopFollowingSettings = followSettingsChanges(applyLocale)

		ctx.addEventListener(window, 'modrinth-extras:cf-navigated', () => {
			console.log(
				`[Modrinth Extras] CurseForge integration: SPA navigation detected to ${window.location.pathname}`,
			)
			void updateModrinthButton()
		})

		ctx.onInvalidated(() => {
			lookupAttempt++
			stopFollowingSettings()
			hideModrinthButton()
		})
		void updateModrinthButton()
	},
})
