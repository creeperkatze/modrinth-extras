import ActivitySparkline from '../../components/project/ActivitySparkline.vue'
import GalleryBackground from '../../components/project/GalleryBackground.vue'
import MonetizationBadge from '../../components/project/MonetizationBadge.vue'
import ProjectReviews from '../../components/project/reviews/ProjectReviews.vue'
import TranslateDescription from '../../components/project/TranslateDescription.vue'
import { isTranslationSupported } from '../../features/translation/translator'
import { createExtensionApp, createInjection, type SettingsGetter } from '../injection'
import { PROJECT_TYPE_PATTERN } from '../page'

export function projectInjections(settings: SettingsGetter) {
	const activitySparkline = createInjection({
		id: 'modrinth-extras-activity-sparkline',
		isEnabled: () => settings().activitySparkline.enabled,
		settingsKeys: ['activitySparkline'],
		persistent: false,
		projectScoped: true,
		attach(container) {
			const path = window.location.pathname
			if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/?#]+/.test(path)) return false
			const header = document.querySelector('.normal-page__header')
			if (!header) return false
			// Try the border div first (description/versions tabs), fall back to header itself (gallery tab)
			const target =
				header.querySelector<HTMLElement>('div.border-b.border-solid.border-divider') ??
				(header as HTMLElement)
			target.style.position = 'relative'
			target.style.isolation = 'isolate'
			container.style.display = 'contents'
			target.appendChild(container)
			return document.contains(container)
		},
		createApp() {
			const slug = window.location.pathname.match(
				/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
			)?.[2]
			return createExtensionApp(ActivitySparkline, {
				projectSlug: slug ?? '',
				days: Number(settings().activitySparkline.days),
			})
		},
	})

	const galleryBackground = createInjection({
		id: 'modrinth-extras-gallery-background',
		isEnabled: () => settings().galleryBackground.enabled,
		settingsKeys: ['galleryBackground'],
		persistent: false,
		projectScoped: true,
		attach(container) {
			const path = window.location.pathname
			if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/?#]+/.test(path))
				return false
			const header = document.querySelector('.normal-page__header')
			if (!header) return false
			const page = header.parentElement
			if (!page) return false
			container.style.display = 'contents'
			page.insertBefore(container, page.firstChild)
			return true
		},
		createApp() {
			const slug = window.location.pathname.match(
				/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
			)?.[2]
			return createExtensionApp(GalleryBackground, { projectSlug: slug ?? '' })
		},
	})

	const monetizationBadge = createInjection({
		id: 'modrinth-extras-monetization-badge',
		isEnabled: () => settings().monetizationBadge.enabled,
		settingsKeys: ['monetizationBadge'],
		persistent: false,
		projectScoped: true,
		attach(container) {
			const path = window.location.pathname
			if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/?#]+/.test(path)) return false
			const list = document.querySelector<HTMLElement>(
				'.normal-page__sidebar [class*="[&>div]:items-center"]',
			)
			if (!list) return false
			container.style.display = 'contents'
			list.appendChild(container)
			return document.contains(container)
		},
		createApp() {
			const slug = window.location.pathname.match(
				/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
			)?.[2]
			return createExtensionApp(MonetizationBadge, { projectSlug: slug ?? '' })
		},
	})

	const translateDescription = createInjection({
		id: 'modrinth-extras-translate-description',
		isEnabled: () => settings().translateDescription.enabled && isTranslationSupported(),
		settingsKeys: ['translateDescription'],
		persistent: false,
		projectScoped: true,
		scopeKey: () => window.location.pathname,
		attach(container) {
			const path = window.location.pathname
			if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/?#]+\/?$/.test(path))
				return false
			const descriptionCard = document.querySelector<HTMLElement>('.normal-page__content .card')
			if (!descriptionCard) return false
			container.style.display = 'contents'
			descriptionCard.parentElement?.insertBefore(container, descriptionCard)
			return document.contains(container)
		},
		createApp() {
			const slug = window.location.pathname.match(
				/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
			)?.[2]
			return createExtensionApp(TranslateDescription, { projectSlug: slug ?? '' })
		},
	})

	const projectReviews = createInjection({
		id: 'modrinth-extras-project-reviews',
		isEnabled: () =>
			settings().reviews.enabled && (settings().reviews.moddex || settings().reviews.spigot),
		settingsKeys: ['reviews'],
		persistent: false,
		projectScoped: true,
		attach(container) {
			if (!PROJECT_TYPE_PATTERN.test(window.location.pathname)) return false
			const nav = document.querySelector<HTMLElement>('.normal-page__content > div > nav')
			if (!nav) return false
			container.style.display = 'contents'
			nav.appendChild(container)
			return document.contains(container)
		},
		createApp() {
			const [, projectType, slug] = window.location.pathname.match(PROJECT_TYPE_PATTERN) ?? []
			return createExtensionApp(ProjectReviews, {
				projectSlug: slug ?? '',
				isModpack: projectType === 'modpack',
				moddex: settings().reviews.moddex,
				spigot: settings().reviews.spigot,
			})
		},
	})

	return [
		activitySparkline,
		galleryBackground,
		monetizationBadge,
		translateDescription,
		projectReviews,
	]
}
