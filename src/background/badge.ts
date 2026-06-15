import type { Labrinth } from '@modrinth/api-client'
import { browser } from 'wxt/browser'

import { getBackgroundAuthToken, modrinthClient } from '../utils/api'
import { fetchNotifications, groupNotifications, type Notification } from '../utils/notifications'
import { getSettings } from '../utils/settings'
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
	const unread = groupNotifications((notifications as Notification[]).filter((n) => !n.read)).length
	console.log(`[Modrinth Extras] Badge: Restored cached: ${unread} unread`)
	await setBadge(unread)
}

export async function applyNotifications(
	newNotifs: Notification[],
	prevNotifs: Notification[] | null,
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

		const user = await modrinthClient.request<Labrinth.Users.v2.User>('/user', {
			api: 'labrinth',
			version: 2,
		})
		if (!user?.id) throw new Error('Failed to fetch user')

		const notifs = await fetchNotifications(user.id)
		await applyNotifications(
			notifs,
			Array.isArray(prevNotifs) ? (prevNotifs as Notification[]) : null,
			user.id,
		)
	} catch (err) {
		console.error('[Modrinth Extras] Badge: Background update failed:', err)
		await setBadge(0)
	}
}
