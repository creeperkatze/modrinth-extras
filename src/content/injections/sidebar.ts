import DependencySidebar from '../../components/sidebar/dependencies/DependencySidebar.vue'
import DiscordSidebar from '../../components/sidebar/DiscordSidebar.vue'
import ModpacksSidebar from '../../components/sidebar/ModpacksSidebar.vue'
import PlatformsSidebar from '../../components/sidebar/PlatformsSidebar.vue'
import RepositorySidebar from '../../components/sidebar/RepositorySidebar.vue'
import ToolsSidebar from '../../components/sidebar/ToolsSidebar.vue'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'
import { attachToSidebar, currentPageUrl } from '../page'

const PROJECT_DEP_PATTERN =
	/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/?#]+)(?:\/version\/([^/?#]+))?/

// getProjectSlug() is null on user pages, so the scope key has to cover both page kinds.
const PLATFORM_SUBJECT_PATTERN =
	/^\/(?:mod|plugin|datapack|shader|resourcepack|modpack|server|user|organization)\/([^/?#]+)/

// Returned in the order they should appear in the sidebar.
export function sidebarInjections(settings: SettingsGetter) {
	const toolsSidebar = createInjection({
		id: 'modrinth-extras-tools-sidebar',
		isEnabled: () => settings().toolsSidebar.enabled,
		settingsKeys: ['toolsSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachToSidebar,
		createApp: () =>
			createExtensionApp(ToolsSidebar, {
				pageUrl: currentPageUrl(),
				modManager: settings().toolsSidebar.modManager,
			}),
	})

	const dependencySidebar = createInjection({
		id: 'modrinth-extras-dependency-sidebar',
		isEnabled: () => settings().dependencySidebar.enabled,
		settingsKeys: ['dependencySidebar', 'dependencyExplorer'],
		persistent: false,
		projectScoped: true,
		scopeKey: () =>
			window.location.pathname.match(PROJECT_DEP_PATTERN)?.slice(2, 4).join('/') ?? '',
		attach(container) {
			if (!PROJECT_DEP_PATTERN.test(window.location.pathname)) return false
			return attachToSidebar(container)
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
		id: 'modrinth-extras-modpacks-sidebar',
		isEnabled: () => settings().modpacksSidebar.enabled,
		settingsKeys: ['modpacksSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachToSidebar,
		createApp: () => createExtensionApp(ModpacksSidebar, { pageUrl: currentPageUrl() }),
	})

	const platformsSidebar = createInjection({
		id: 'modrinth-extras-platforms-sidebar',
		isEnabled: () => settings().platformsSidebar.enabled,
		settingsKeys: ['platformsSidebar'],
		persistent: false,
		projectScoped: true,
		scopeKey: () => window.location.pathname.match(PLATFORM_SUBJECT_PATTERN)?.[0] ?? '',
		attach: attachToSidebar,
		createApp: () => createExtensionApp(PlatformsSidebar, { pageUrl: currentPageUrl() }),
	})

	const repositorySidebar = createInjection({
		id: 'modrinth-extras-repository-sidebar',
		isEnabled: () => settings().githubSidebar.enabled,
		settingsKeys: ['githubSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachToSidebar,
		createApp: () => createExtensionApp(RepositorySidebar, { pageUrl: currentPageUrl() }),
	})

	const discordSidebar = createInjection({
		id: 'modrinth-extras-discord-sidebar',
		isEnabled: () => settings().discordSidebar.enabled,
		settingsKeys: ['discordSidebar'],
		persistent: false,
		projectScoped: true,
		attach: attachToSidebar,
		createApp: () => createExtensionApp(DiscordSidebar, { pageUrl: currentPageUrl() }),
	})

	return [
		toolsSidebar,
		dependencySidebar,
		modpacksSidebar,
		platformsSidebar,
		repositorySidebar,
		discordSidebar,
	]
}
