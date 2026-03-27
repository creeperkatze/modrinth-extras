import { browser } from 'wxt/browser'

import { apiFetch, getBackgroundAuthToken } from '../helpers/apiFetch'
import { groupNotifications, type PlatformNotification } from '../helpers/platform-notifications'
import { getSettings } from '../helpers/settings'
import { sendDesktopNotifications } from './desktop-notifications'

export async function setBadge(unread: number) {
	const action = browser.action ?? browser.browserAction

	await action.setBadgeBackgroundColor({ color: '#1bd96a' })
	await action.setBadgeText({ text: unread > 0 ? String(unread) : '' })
}

export async function showCachedBadge() {
	const [{ notificationBadge }, { notifications }] = await Promise.all([
		getSettings(),
		browser.storage.local.get('notifications'),
	])
	if (!notificationBadge.enabled || !Array.isArray(notifications)) return
	const unread = groupNotifications(
		(notifications as PlatformNotification[]).filter((n) => !n.read),
	).length
	console.log(`[Modrinth Extras] Badge: Restored cached: ${unread} unread`)
	await setBadge(unread)
}

export async function applyNotifications(
	newNotifs: PlatformNotification[],
	prevNotifs: PlatformNotification[] | null,
	userId?: string,
) {
	const { notificationBadge } = await getSettings()
	const unread = groupNotifications(newNotifs.filter((n) => !n.read)).length
	console.log(
		`[Modrinth Extras] Badge: Applying ${newNotifs.length} notifications: ${unread} unread`,
	)
	if (notificationBadge.enabled) {
		await setBadge(unread)
	}
	await sendDesktopNotifications(newNotifs, prevNotifs)
	await browser.storage.local.set({
		...(userId ? { userId } : {}),
		notifications: newNotifs,
		lastUpdated: Date.now(),
	})
}

export async function updateBadge() {
	try {
		const [{ notificationBadge }, { notifications: prevNotifs }] = await Promise.all([
			getSettings(),
			browser.storage.local.get('notifications'),
		])
		if (!notificationBadge.enabled) {
			await setBadge(0)
			return
		}

		const token = await getBackgroundAuthToken()
		if (!token) {
			console.log('[Modrinth Extras] Badge: No auth token, clearing badge')
			await setBadge(0)
			await browser.storage.local.set({
				userId: null,
				notifications: null,
				lastUpdated: Date.now(),
			})
			return
		}

		const user = (await apiFetch('user', { token })) as { id?: string } | null
		if (!user?.id) throw new Error('Failed to fetch user')

		const notifs = await apiFetch(`user/${user.id}/notifications`, { token })
		if (Array.isArray(notifs)) {
			await applyNotifications(
				notifs as PlatformNotification[],
				Array.isArray(prevNotifs) ? (prevNotifs as PlatformNotification[]) : null,
				user.id,
			)
		}
	} catch (err) {
		console.error('[Modrinth Extras] Badge: Background update failed:', err)
		await setBadge(0)
	}
}
