import type { ReviewSort } from 'moddex-js'
import { browser } from 'wxt/browser'

import {
	pollNotifications,
	refreshNotifications,
	removeOldNotificationCache,
	setNotificationsRead,
	syncBadge,
} from '../background/badge'
import { fetchDiscordInvite } from '../background/external/discord'
import { fetchModdexReviews, hasModdexProject } from '../background/external/moddex'
import { fetchModgradeProject } from '../background/external/modgrade'
import { findPlatformProjects, findPlatformUsers } from '../background/external/platforms'
import {
	fetchCurseForgeComments,
	hasCurseForgeComments,
} from '../background/external/platforms/curseforge'
import {
	fetchSpigotReviews,
	findSpigotProject,
	type SpigotReviewSort,
} from '../background/external/platforms/spigot'
import { fetchRepositoryStats } from '../background/external/repositories'
import { findModrinthMatch } from '../background/modrinth-match'
import { handleNotificationClick } from '../background/notifications'
import { syncSearchResultsScript } from '../background/search-results-script'
import type { ExtensionSettings } from '../core/settings'
import {
	analytics,
	initTelemetry,
	type SerializedError,
	trackExtensionStarted,
} from '../core/telemetry'
import { refreshAccount } from '../features/account/account'
import type { MatchableProject } from '../features/platforms/matching'
import type { PlatformPage } from '../features/platforms/pages'
import { movePromptsToSync, saveInstallDate } from '../features/prompts/state'
import type { RepositoryPlatform } from '../features/repository/links'
import { markExtensionUpdated } from '../features/tour/state'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	void initTelemetry()

	browser.storage.onChanged.addListener((changes, area) => {
		if (!('settings' in changes)) return
		const newSettings = changes.settings?.newValue as
			| {
					notificationBadge?: { enabled?: boolean }
					curseforgeIntegration?: ExtensionSettings['curseforgeIntegration']
			  }
			| undefined
		const oldSettings = changes.settings?.oldValue as
			| {
					notificationBadge?: { enabled?: boolean }
					curseforgeIntegration?: ExtensionSettings['curseforgeIntegration']
			  }
			| undefined
		if (
			area === 'local' &&
			newSettings?.notificationBadge?.enabled !== oldSettings?.notificationBadge?.enabled
		) {
			void syncBadge()
			if (newSettings?.notificationBadge?.enabled) void pollNotifications()
		}
		if (
			JSON.stringify(newSettings?.curseforgeIntegration) !==
			JSON.stringify(oldSettings?.curseforgeIntegration)
		) {
			void syncSearchResultsScript(newSettings?.curseforgeIntegration)
		}
	})

	browser.notifications?.onClicked.addListener(handleNotificationClick)
	browser.permissions.onAdded.addListener((permissions) => {
		if (permissions.permissions?.includes('notifications')) {
			browser.notifications.onClicked.addListener(handleNotificationClick)
		}
	})
	browser.permissions.onAdded.addListener(() => void syncSearchResultsScript())
	browser.permissions.onRemoved.addListener(() => void syncSearchResultsScript())

	browser.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES })

	browser.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === ALARM_NAME) void pollNotifications()
	})

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type === 'capture-exception') {
			void analytics.captureException(
				message.error as SerializedError,
				message.properties as Record<string, string | undefined> | undefined,
			)
			return
		}
		if (message.type === 'refresh-notifications') {
			refreshNotifications(message.maxAge as number)
				.then(() => sendResponse({ ok: true }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to refresh the notifications:', err)
					sendResponse({ ok: false })
				})
			return true
		}
		if (message.type === 'set-notifications-read') {
			setNotificationsRead(
				message.userId as string,
				message.ids as string[],
				message.read as boolean,
			)
				.then(() => sendResponse({ ok: true }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to save the read notifications:', err)
					sendResponse({ ok: false })
				})
			return true
		}
		if (message.type === 'resolve-curseforge-search-result') {
			;(async () => {
				const url = new URL(message.url as string)
				if (url.hostname !== 'www.google.com' || !['/url', '/goto'].includes(url.pathname)) {
					sendResponse({ ok: false })
					return
				}
				const response = await fetch(url.href, { redirect: 'follow', credentials: 'include' })
				await response.body?.cancel()
				const destination = new URL(response.url)
				if (destination.hostname !== 'www.curseforge.com') {
					sendResponse({ ok: false })
					return
				}
				sendResponse({ ok: true, url: destination.href })
			})().catch((err) => {
				console.error('[Modrinth Extras] Failed to resolve a CurseForge search result:', err)
				sendResponse({ ok: false })
			})
			return true
		}
		if (message.type === 'repository-stats') {
			const platform = message.platform as RepositoryPlatform
			const repo = message.repo as string
			fetchRepositoryStats(platform, repo)
				.then((stats) => sendResponse({ ok: true, stats }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch repository stats:', err)
					sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
				})
			return true
		}
		if (message.type === 'platform-matches') {
			const lookup =
				message.kind === 'user'
					? findPlatformUsers(message.username as string)
					: findPlatformProjects(message.project as MatchableProject)
			lookup
				.then((matches) => sendResponse({ ok: true, matches }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch platform matches:', err)
					sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
				})
			return true
		}
		if (message.type === 'modrinth-match') {
			findModrinthMatch(message.page as PlatformPage)
				.then((match) => sendResponse({ ok: true, match }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to find the project on Modrinth:', err)
					sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
				})
			return true
		}
		if (message.type === 'moddex-reviews') {
			fetchModdexReviews(message.slug as string, message.sort as ReviewSort, message.page as number)
				.then((result) => sendResponse(result))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch ModDex reviews:', err)
					sendResponse({ ok: false, error: 'failed' })
				})
			return true
		}
		if (message.type === 'spigot-reviews') {
			fetchSpigotReviews(
				message.project as MatchableProject,
				message.sort as SpigotReviewSort,
				message.page as number,
			)
				.then((result) => sendResponse(result))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch SpigotMC reviews:', err)
					sendResponse({ ok: false, error: 'failed' })
				})
			return true
		}
		if (message.type === 'review-source-available') {
			const project = message.project as MatchableProject
			const lookup =
				message.source === 'moddex'
					? hasModdexProject(message.slug as string)
					: message.source === 'curseforge'
						? hasCurseForgeComments(project)
						: findSpigotProject(project).then((match) => match !== null)
			lookup
				.then((available) => sendResponse(available))
				.catch((err) => {
					console.error(`[Modrinth Extras] Failed to look up ${message.source} reviews:`, err)
					sendResponse(false)
				})
			return true
		}
		if (message.type === 'curseforge-comments') {
			fetchCurseForgeComments(message.project as MatchableProject, message.page as number)
				.then((result) => sendResponse(result))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch CurseForge comments:', err)
					sendResponse({ ok: false, error: 'failed' })
				})
			return true
		}
		if (message.type === 'modgrade-project') {
			fetchModgradeProject(message.slug as string)
				.then((result) => sendResponse({ ok: true, result }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch Modgrade project:', err)
					sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
				})
			return true
		}
		if (message.type === 'discord-invite') {
			const code = message.code as string
			fetchDiscordInvite(code)
				.then((invite) => sendResponse({ ok: true, invite }))
				.catch((err) => {
					console.error('[Modrinth Extras] Failed to fetch Discord invite:', err)
					sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) })
				})
			return true
		}
	})

	// The account only changes when the user signs in or out, so polling doesn't fetch it
	async function refreshAccountAndNotifications() {
		try {
			await refreshAccount()
		} catch (err) {
			console.error('[Modrinth Extras] Failed to refresh the signed in account:', err)
		}
		await pollNotifications()
	}

	browser.runtime.onInstalled.addListener((details) => {
		void refreshAccountAndNotifications()
		void syncSearchResultsScript()
		if (details.reason === 'install') {
			void analytics.track('extension_installed')
			saveInstallDate().catch((err) =>
				console.error('[Modrinth Extras] Failed to save the install date:', err),
			)
		} else if (details.reason === 'update') {
			void analytics.track('extension_updated', { from_extension_version: details.previousVersion })
			markExtensionUpdated().catch((err) =>
				console.error('[Modrinth Extras] Failed to save the extension update:', err),
			)
			movePromptsToSync().catch((err) =>
				console.error('[Modrinth Extras] Failed to move the prompts to sync:', err),
			)
			removeOldNotificationCache().catch((err) =>
				console.error('[Modrinth Extras] Failed to remove the old notification cache:', err),
			)
		}
	})

	browser.runtime.onStartup.addListener(() => {
		void trackExtensionStarted()
		void syncBadge()
		void refreshAccountAndNotifications()
		void syncSearchResultsScript()
	})

	browser.cookies.onChanged.addListener((changeInfo) => {
		if (changeInfo.cookie.name === 'auth-token' && changeInfo.cookie.domain.includes('modrinth')) {
			void refreshAccountAndNotifications()
		}
	})

	void syncBadge()
	void pollNotifications()
	void syncSearchResultsScript()
})
