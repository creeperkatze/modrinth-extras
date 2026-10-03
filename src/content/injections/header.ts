import NotificationsIndicator from '../../components/header/NotificationsIndicator.vue'
import QuickSearch from '../../components/header/QuickSearch.vue'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'

export function headerInjections(settings: SettingsGetter) {
	const notifications = createInjection({
		id: 'modrinth-extras-notifications',
		isEnabled: () => settings().notificationsIndicator.enabled,
		settingsKeys: ['notificationsIndicator'],
		persistent: true,
		attach(container) {
			const header = document.querySelector('header')
			if (!header) return false

			const triggers = [...header.querySelectorAll<HTMLElement>('.btn-dropdown-animation')]
			const userTrigger = triggers.findLast((el) => !!el.querySelector('img')) ?? null
			if (!userTrigger) return false

			let childInFlex: HTMLElement = userTrigger
			let flexRow: HTMLElement | null = userTrigger.parentElement
			while (flexRow && flexRow !== header) {
				const { display } = window.getComputedStyle(flexRow)
				if (display === 'flex' || display === 'inline-flex') break
				childInFlex = flexRow
				flexRow = flexRow.parentElement as HTMLElement | null
			}
			if (!flexRow) return false

			container.style.display = 'flex'
			container.style.alignItems = 'center'
			flexRow.insertBefore(container, childInFlex)
			return true
		},
		createApp: () => createExtensionApp(NotificationsIndicator, {}, { tooltips: true }),
	})

	const quickSearch = createInjection({
		id: 'modrinth-extras-quick-search',
		isEnabled: () => settings().quickSearch.enabled,
		settingsKeys: ['quickSearch'],
		persistent: true,
		attach(container) {
			document.body.appendChild(container)
			return true
		},
		createApp: () => createExtensionApp(QuickSearch),
	})

	return [notifications, quickSearch]
}
