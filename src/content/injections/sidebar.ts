import { watch } from 'vue'

import DependencySidebar from '../../components/sidebar/dependencies/DependencySidebar.vue'
import DiscordSidebar from '../../components/sidebar/DiscordSidebar.vue'
import SidebarLayoutControls from '../../components/sidebar/layout/SidebarLayoutControls.vue'
import ModpacksSidebar from '../../components/sidebar/ModpacksSidebar.vue'
import PlatformsSidebar from '../../components/sidebar/PlatformsSidebar.vue'
import RepositorySidebar from '../../components/sidebar/RepositorySidebar.vue'
import ToolsSidebar from '../../components/sidebar/ToolsSidebar.vue'
import {
	SIDEBAR_CARD_IDS,
	SIDEBAR_LAYOUT_ID,
	type SidebarCardSetting,
	sidebarCardSetting,
} from '../../features/sidebar-layout/cards'
import { editingSidebar } from '../../features/sidebar-layout/editing'
import { sidebarOrder } from '../../features/sidebar-layout/order'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'
import { attachToSidebar, currentPageUrl } from '../page'

const PROJECT_DEP_PATTERN =
	/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/?#]+)(?:\/version\/([^/?#]+))?/

// getProjectSlug() is null on user pages, so the scope key has to cover both page kinds.
const PLATFORM_SUBJECT_PATTERN =
	/^\/(?:mod|plugin|datapack|shader|resourcepack|modpack|server|user|organization)\/([^/?#]+)/

export function sidebarInjections(settings: SettingsGetter) {
	// Hidden cards still mount while editing the layout, so they can be shown again
	const shown = (setting: SidebarCardSetting) => settings()[setting].enabled || editingSidebar.value

	// Marks hidden cards so the layout editor can fade them
	const attachInOrder = (container: HTMLElement) => {
		const setting = sidebarCardSetting(container)
		container.toggleAttribute('data-hidden', !!setting && !settings()[setting].enabled)
		return attachToSidebar(container, sidebarOrder(settings()))
	}

	const toolsSidebar = createInjection({
		id: SIDEBAR_CARD_IDS.toolsSidebar,
		isEnabled: () => shown('toolsSidebar'),
		settingsKeys: ['toolsSidebar'],
		persistent: false,
		projectScoped: true,
		scopeKey: () =>
			window.location.pathname.match(PROJECT_DEP_PATTERN)?.slice(2, 4).join('/') ?? '',
		attach: attachInOrder,
		createApp: () =>
			createExtensionApp(ToolsSidebar, {
				pageUrl: currentPageUrl(),
				modManager: settings().toolsSidebar.modManager,
				decompiler: settings().toolsSidebar.decompiler,
			}),
	})

	const dependencySidebar = createInjection({
		id: SIDEBAR_CARD_IDS.dependencySidebar,
		isEnabled: () => shown('dependencySidebar'),
		settingsKeys: ['dependencySidebar', 'dependencyExplorer'],
		persistent: false,
		projectScoped: true,
		scopeKey: () =>
			window.location.pathname.match(PROJECT_DEP_PATTERN)?.slice(2, 4).join('/') ?? '',
		attach(container) {
			if (!PROJECT_DEP_PATTERN.test(window.location.pathname)) return false
			return attachInOrder(container)
		},
		createApp() {
			const match = window.location.pathname.match(PROJECT_DEP_PATTERN)
			return createExtensionApp(DependencySidebar, {
				projectSlug: match?.[2] ?? '',
				versionNumber: match?.[3],
				showExplorer: settings().dependencyExplorer.enabled,
			})
		},
	})

	const modpacksSidebar = createInjection({
		id: SIDEBAR_CARD_IDS.modpacksSidebar,
		isEnabled: () => shown('modpacksSidebar'),
		settingsKeys: ['modpacksSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachInOrder,
		createApp: () => createExtensionApp(ModpacksSidebar, { pageUrl: currentPageUrl() }),
	})

	const platformsSidebar = createInjection({
		id: SIDEBAR_CARD_IDS.platformsSidebar,
		isEnabled: () => shown('platformsSidebar'),
		settingsKeys: ['platformsSidebar'],
		persistent: false,
		projectScoped: true,
		scopeKey: () => window.location.pathname.match(PLATFORM_SUBJECT_PATTERN)?.[0] ?? '',
		attach: attachInOrder,
		createApp: () => createExtensionApp(PlatformsSidebar, { pageUrl: currentPageUrl() }),
	})

	const repositorySidebar = createInjection({
		id: SIDEBAR_CARD_IDS.githubSidebar,
		isEnabled: () => shown('githubSidebar'),
		settingsKeys: ['githubSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachInOrder,
		createApp: () => createExtensionApp(RepositorySidebar, { pageUrl: currentPageUrl() }),
	})

	const discordSidebar = createInjection({
		id: SIDEBAR_CARD_IDS.discordSidebar,
		isEnabled: () => shown('discordSidebar'),
		settingsKeys: ['discordSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachInOrder,
		createApp: () => createExtensionApp(DiscordSidebar, { pageUrl: currentPageUrl() }),
	})

	// Always attached. The controls decide when to show.
	const sidebarLayout = createInjection({
		id: SIDEBAR_LAYOUT_ID,
		isEnabled: () => true,
		settingsKeys: [],
		persistent: false,
		projectScoped: true,
		attach: attachInOrder,
		createApp: () => createExtensionApp(SidebarLayoutControls),
	})

	const cards = [
		toolsSidebar,
		dependencySidebar,
		modpacksSidebar,
		platformsSidebar,
		repositorySidebar,
		discordSidebar,
	]

	watch(editingSidebar, () => {
		for (const card of cards) {
			if (card.config.isEnabled()) card.schedule()
			else card.unmount()
		}
	})

	return [...cards, sidebarLayout]
}
