import ErrorNotice from '../../components/site/ErrorNotice.vue'
import FooterBadge from '../../components/site/FooterBadge.vue'
import { createExtensionApp, createInjection } from '../injection'

function getErrorStatusCode(errorBox: Element): number | null {
	const details = errorBox.querySelector<HTMLElement>('.error-box__details')
	const statusText = details?.querySelector('p')?.textContent?.trim() ?? ''
	const statusCode = Number(statusText.match(/^Error\s+(\d+)$/)?.[1])
	return Number.isFinite(statusCode) ? statusCode : null
}

function shouldShowErrorNotice(errorBox: Element): boolean {
	const statusCode = getErrorStatusCode(errorBox)
	if (statusCode === null) return false
	return statusCode === 1000 || statusCode >= 500
}

export function siteInjections() {
	const errorNotice = createInjection({
		id: 'modrinth-extras-error-notice',
		isEnabled: () => true,
		settingsKeys: [],
		persistent: false,
		attach(container) {
			const errorBox = document.querySelector('.error-box')
			if (!errorBox) return false
			if (!shouldShowErrorNotice(errorBox)) return false

			errorBox.appendChild(container)
			return true
		},
		createApp: () => createExtensionApp(ErrorNotice),
	})

	const footerBadge = createInjection({
		id: 'modrinth-extras-footer-badge',
		isEnabled: () => true,
		settingsKeys: [],
		persistent: true,
		attach(container) {
			const link = document.querySelector<HTMLAnchorElement>(
				'footer a[href="https://github.com/modrinth/code"]',
			)
			if (!link) return false

			const flexCol = link.closest('.flex.flex-wrap.justify-center.gap-3')
			if (!flexCol) return false

			container.style.display = 'flex'
			container.style.flexDirection = 'column'
			container.style.width = '100%'
			flexCol.appendChild(container)
			return true
		},
		createApp: () => createExtensionApp(FooterBadge),
	})

	return [errorNotice, footerBadge]
}
