import type { Labrinth } from '@modrinth/api-client'
import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'

import { getBackgroundAuthToken, modrinthClient } from '../utils/api'
import { fetchNotifications, groupNotifications, type Notification } from '../utils/notifications'
import { getSettings } from '../utils/settings'
import { sendDesktopNotifications } from './desktop-notifications'

export const notificationsItem = storage.defineItem<Notification[] | null>('local:notifications', {
	defaultValue: null,
})
export const userIdItem = storage.defineItem<string | null>('local:userId', { defaultValue: null })
export const lastUpdatedItem = storage.defineItem<number | null>('local:lastUpdated', {
	defaultValue: null,
})

export async function setBadge(unread: number) {
	const action = browser.action ?? browser.browserAction

	await action.setBadgeBackgroundColor({ color: '#1bd96a' })
	await action.setBadgeText({ text: unread > 0 ? String(unread) : '' })
}

export async function showCachedBadge() {
	const [{ notificationBadge }, notifications] = await Promise.all([
		getSettings(),
		notificationsItem.getValue(),
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
	await Promise.all([
		...(userId ? [userIdItem.setValue(userId)] : []),
		notificationsItem.setValue(newNotifs),
		lastUpdatedItem.setValue(Date.now()),
	])
}

export async function updateBadge() {
	try {
		const [{ notificationBadge }, prevNotifs] = await Promise.all([
			getSettings(),
			notificationsItem.getValue(),
		])
		if (!notificationBadge.enabled) {
			await setBadge(0)
			return
		}

		const token = await getBackgroundAuthToken()
		if (!token) {
			console.log('[Modrinth Extras] Badge: No auth token, clearing badge')
			await setBadge(0)
			await Promise.all([
				userIdItem.setValue(null),
				notificationsItem.setValue(null),
				lastUpdatedItem.setValue(Date.now()),
			])
			return
		}

		const user = await modrinthClient.request<Labrinth.Users.v2.User>('/user', {
			api: 'labrinth',
			version: 2,
		})
		if (!user?.id) throw new Error('Failed to fetch user')

		const notifs = await fetchNotifications(user.id)
		await applyNotifications(notifs, Array.isArray(prevNotifs) ? prevNotifs : null, user.id)
	} catch (err) {
		console.error('[Modrinth Extras] Badge: Background update failed:', err)
		await setBadge(0)
	}
}
