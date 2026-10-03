import ProjectCardActions from '../../components/search/ProjectCardActions.vue'
import { initFollowState } from '../../features/project-cards/follow'
import { createDynamicInjection, createExtensionApp, type SettingsGetter } from '../injection'
import { PROJECT_TYPE_PATTERN } from '../page'

function getCardHref(card: HTMLElement): string {
	return card.parentElement?.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href') ?? ''
}

function attachCardActions(card: HTMLElement): HTMLElement | null {
	if (!getCardHref(card).match(PROJECT_TYPE_PATTERN)) return null

	const listCardDiv = card.querySelector<HTMLElement>('.grid-project-card-list')
	if (listCardDiv) {
		const existingActions = listCardDiv.querySelector<HTMLElement>(
			'.grid-project-card-list__actions',
		)
		if (existingActions) {
			const container = document.createElement('div')
			container.style.cssText = 'display:contents;pointer-events:auto'
			existingActions.appendChild(container)
			return container
		}

		listCardDiv.classList.add('has-actions')
		const el = document.createElement('div')
		el.style.cssText =
			'grid-area:actions;display:flex;gap:0.25rem;flex-shrink:0;margin-left:auto;align-items:center;pointer-events:auto'
		listCardDiv.appendChild(el)
		return el
	}

	for (const el of card.querySelectorAll<HTMLElement>('[class*="empty:hidden"]')) {
		if (!el.className.includes('grid-project-card-list__')) {
			const container = document.createElement('div')
			container.style.cssText = 'display:contents;pointer-events:auto'
			el.appendChild(container)
			return container
		}
	}

	return null
}

export function searchInjections(settings: SettingsGetter) {
	const projectCardActions = createDynamicInjection({
		settingsKeys: ['projectCardActions'],
		persistent: false,
		isEnabled: () => settings().projectCardActions.enabled,
		targets: '.project-card-container',
		onSchedule: () => initFollowState(),
		attach: attachCardActions,
		createApp(target) {
			const [, projectType, projectSlug] = getCardHref(target).match(PROJECT_TYPE_PATTERN) ?? []
			const { modLoader, pluginLoader, shaderLoader, gameVersion, downloadDependencies } =
				settings().projectCardActions
			return createExtensionApp(
				ProjectCardActions,
				{
					projectSlug: projectSlug ?? '',
					projectType: projectType ?? '',
					downloadSettings: {
						modLoader,
						pluginLoader,
						shaderLoader,
						gameVersion,
						downloadDependencies,
					},
				},
				{ tooltips: true },
			)
		},
	})

	return [projectCardActions]
}
