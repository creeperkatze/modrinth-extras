import { browser } from 'wxt/browser'

import { getAuthToken, usePopupFetch } from '../composables/usePopupFetch'
import {
	fetchExtraNotificationData,
	groupNotifications,
	type PlatformNotification,
} from '../helpers/platform-notifications'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	// Maps notification ID to the relative link so the click handler can open the right page.
	const notificationLinks = new Map<string, string>()

	async function showCachedBadge() {
		const { showBadge = true, notifications } = await browser.storage.local.get([
			'showBadge',
			'notifications',
		])
		if (!showBadge || !Array.isArray(notifications)) return
		const unread = groupNotifications(
			(notifications as PlatformNotification[]).filter((n) => !n.read),
		).length
		console.log(`[Modrinth Extras] Restored cached badge: ${unread} unread`)
		await browser.action.setBadgeBackgroundColor({ color: '#1bd96a' })
		await browser.action.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })
	}

	async function sendDesktopNotifications(
		newNotifs: PlatformNotification[],
		prevNotifs: PlatformNotification[] | null,
	) {
		const { desktopNotifications = false } = await browser.storage.local.get('desktopNotifications')
		if (!desktopNotifications) return

		// No prior state means this is the first run, save baseline without notifying
		if (prevNotifs === null) {
			console.log(
				'[Modrinth Extras] Desktop notifications: First run, saving baseline without notifying',
			)
			return
		}

		const prevIds = new Set(prevNotifs.map((n) => n.id))
		const brandNew = newNotifs.filter((n) => !n.read && !prevIds.has(n.id))
		if (brandNew.length === 0) {
			console.log('[Modrinth Extras] Desktop notifications: No new notifications')
			return
		}

		console.log(
			`[Modrinth Extras] Desktop notifications: ${brandNew.length} new, fetching extra data`,
		)
		await fetchExtraNotificationData(brandNew, usePopupFetch)

		const grouped = groupNotifications(brandNew)
		console.log(
			`[Modrinth Extras] Desktop notifications: Sending ${grouped.length} notification(s) (${brandNew.length} raw, ${grouped.length} grouped)`,
		)

		for (const notif of grouped) {
			const groupSize = (notif.grouped_notifs?.length ?? 0) + 1
			const iconUrl =
				notif.extra_data?.project?.icon_url ??
				notif.extra_data?.organization?.icon_url ??
				notif.extra_data?.user?.avatar_url ??
				browser.runtime.getURL('/icon-128.png')
			const title =
				notif.type === 'project_update' && notif.extra_data?.project
					? `${notif.extra_data.project.title} has been updated${groupSize > 1 ? ` (${groupSize} new versions)` : ''}`
					: notif.title
			const message = notif.text
			console.log(
				`[Modrinth Extras] Desktop notification: "${title}" (id: ${notif.id}, group size: ${groupSize})`,
			)
			notificationLinks.set(notif.id, notif.link)
			await browser.notifications.create(notif.id, {
				type: 'basic',
				iconUrl,
				title,
				message,
			})
		}
	}

	async function applyNotifications(
		newNotifs: PlatformNotification[],
		prevNotifs: PlatformNotification[] | null,
		userId?: string,
	) {
		const { showBadge = true } = await browser.storage.local.get('showBadge')
		const unread = groupNotifications(newNotifs.filter((n) => !n.read)).length
		console.log(`[Modrinth Extras] Applying ${newNotifs.length} notifications: ${unread} unread`)
		if (showBadge) {
			await browser.action.setBadgeBackgroundColor({ color: '#1bd96a' })
			await browser.action.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })
		}
		await sendDesktopNotifications(newNotifs, prevNotifs)
		await browser.storage.local.set({
			...(userId ? { userId } : {}),
			notifications: newNotifs,
			lastUpdated: Date.now(),
		})
	}

	async function updateBadge() {
		try {
			const { showBadge = true, notifications: prevNotifs } = await browser.storage.local.get([
				'showBadge',
				'notifications',
			])
			if (!showBadge) {
				console.log('[Modrinth Extras] Badge disabled, skipping update')
				browser.action?.setBadgeText({ text: '' })
				return
			}

			const token = await getAuthToken()
			if (!token) {
				console.log('[Modrinth Extras] No auth token, clearing badge')
				browser.action?.setBadgeText({ text: '' })
				await browser.storage.local.set({
					userId: null,
					notifications: null,
					lastUpdated: Date.now(),
				})
				return
			}

			const user = (await usePopupFetch('user')) as { id?: string } | null
			if (!user?.id) {
				console.log('[Modrinth Extras] Could not fetch user, clearing badge')
				browser.action?.setBadgeText({ text: '' })
				return
			}

			const notifs = await usePopupFetch(`user/${user.id}/notifications`)
			if (Array.isArray(notifs)) {
				await applyNotifications(
					notifs as PlatformNotification[],
					Array.isArray(prevNotifs) ? (prevNotifs as PlatformNotification[]) : null,
					user.id,
				)
			}
		} catch (err) {
			console.error('[Modrinth Extras] Background update failed:', err)
			browser.action?.setBadgeText({ text: '' })
		}
	}

	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('showBadge' in changes)) return
		if (changes.showBadge.newValue === false) {
			browser.action?.setBadgeText({ text: '' })
		} else {
			updateBadge()
		}
	})

	browser.notifications.onClicked.addListener(async (notifId) => {
		const link = notificationLinks.get(notifId)
		if (!link) return
		notificationLinks.delete(notifId)
		await browser.notifications.clear(notifId)
		const path = link.startsWith('http') ? new URL(link).pathname : link
		const url = `https://modrinth.com${path}`
		const [existing] = await browser.tabs.query({ url: 'https://modrinth.com/*' })
		if (existing?.id != null) {
			await browser.tabs.sendMessage(existing.id, { type: 'navigate', path })
			await browser.tabs.update(existing.id, { active: true })
			if (existing.windowId != null)
				await browser.windows.update(existing.windowId, { focused: true })
		} else {
			await browser.tabs.create({ url })
		}
	})

	browser.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES })

	browser.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === ALARM_NAME) updateBadge()
	})

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type === 'refresh') {
			updateBadge().then(() => sendResponse({ ok: true }))
			return true
		}
		if (message.type === 'badge-count') {
			const count = message.count as number
			;(async () => {
				await browser.action.setBadgeBackgroundColor({ color: '#1bd96a' })
				await browser.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' })
				sendResponse({ ok: true })
			})()
			return true
		}
		if (message.type === 'notifications-fetched') {
			const newNotifs = message.notifications as PlatformNotification[]
			;(async () => {
				const { notifications: prevNotifs } = await browser.storage.local.get('notifications')
				await applyNotifications(
					newNotifs,
					Array.isArray(prevNotifs) ? (prevNotifs as PlatformNotification[]) : null,
				)
			})()
		}
	})

	// Ensure the service worker wakes immediately on browser start
	browser.runtime.onStartup.addListener(() => {
		showCachedBadge()
		updateBadge()
	})

	// React instantly when the user signs in or out
	browser.cookies.onChanged.addListener((changeInfo) => {
		if (changeInfo.cookie.name === 'auth-token' && changeInfo.cookie.domain.includes('modrinth')) {
			updateBadge()
		}
	})

	showCachedBadge()
	updateBadge()
})
