import CollectionDownloadButton from '../../components/collection/CollectionDownloadButton.vue'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'

const COLLECTION_PATTERN = /^\/collection\/([^/?#]+)\/?$/

function collectionHeading(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.ui-normal-page__header h1')
}

export function collectionInjections(settings: SettingsGetter) {
	const collectionDownload = createInjection({
		id: 'modrinth-extras-collection-download',
		isEnabled: () => settings().collectionDownload.enabled,
		settingsKeys: ['collectionDownload'],
		persistent: false,
		attach(container) {
			if (!COLLECTION_PATTERN.test(window.location.pathname)) return false
			// The header's last column holds the actions, which is empty for other people's collections
			const actions = collectionHeading()?.closest('.grid')?.lastElementChild
			if (!actions) return false
			container.style.display = 'contents'
			actions.prepend(container)
			return document.contains(container)
		},
		createApp() {
			const [, id] = window.location.pathname.match(COLLECTION_PATTERN) ?? []
			return createExtensionApp(CollectionDownloadButton, {
				collectionId: id ?? '',
				collectionName: collectionHeading()?.textContent?.trim() ?? '',
			})
		},
	})

	return [collectionDownload]
}
