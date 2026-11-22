import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'

import { getSettings } from '../core/settings'
import { accountItem } from '../features/account/account'
import {
	fetchNotifications,
	groupNotifications,
	type Notification,
} from '../features/notifications/notifications'
import { sendBrowserNotifications } from './notifications'

interface CachedNotifications {
	// Another account's notifications can't serve as the baseline
	userId: string
	notifications: Notification[]
}

const OLD_USER_ID_KEY = 'local:userId'

export const notificationsItem = storage.defineItem<CachedNotifications | null>(
	'local:notifications',
	{
		defaultValue: null,
		version: 2,
		migrations: {
			// The owner used to be saved under its own key
			2: async (notifications: Notification[] | null) => {
				const userId = await storage.getItem<string>(OLD_USER_ID_KEY)
				await storage.removeItem(OLD_USER_ID_KEY)
				return userId && Array.isArray(notifications) ? { userId, notifications } : null
			},
		},
	},
)
export const lastUpdatedItem = storage.defineItem<number | null>('local:lastUpdated', {
	defaultValue: null,
})

export async function getPreviousNotifications(userId: string): Promise<Notification[] | null> {
	const cached = await notificationsItem.getValue()
	return cached?.userId === userId ? cached.notifications : null
}

export async function setBadge(unread: number) {
	const action = browser.action ?? browser.browserAction

	await action.setBadgeBackgroundColor({ color: '#1bd96a' })
	await action.setBadgeText({ text: unread > 0 ? String(unread) : '' })
}

export async function showCachedBadge() {
	const [{ notificationBadge }, cached] = await Promise.all([
		getSettings(),
		notificationsItem.getValue(),
	])
	if (!notificationBadge.enabled || !cached) return
	const unread = groupNotifications(cached.notifications.filter((n) => !n.read)).length
	console.log(`[Modrinth Extras] Badge: Restored cached: ${unread} unread`)
	await setBadge(unread)
}

export async function applyNotifications(
	newNotifs: Notification[],
	prevNotifs: Notification[] | null,
	userId: string,
) {
	const { notificationBadge } = await getSettings()
	const unread = groupNotifications(newNotifs.filter((n) => !n.read)).length
	console.log(
		`[Modrinth Extras] Badge: Applying ${newNotifs.length} notifications: ${unread} unread`,
	)
	if (notificationBadge.enabled) {
		await setBadge(unread)
	}
	await sendBrowserNotifications(newNotifs, prevNotifs)
	await Promise.all([
		notificationsItem.setValue({ userId, notifications: newNotifs }),
		lastUpdatedItem.setValue(Date.now()),
	])
}

export async function updateBadge() {
	try {
		const account = await accountItem.getValue()
		const { notificationBadge } = await getSettings()
		if (!notificationBadge.enabled) {
			await setBadge(0)
			return
		}

		if (!account) {
			console.log('[Modrinth Extras] Badge: Signed out, clearing badge')
			await setBadge(0)
			await Promise.all([notificationsItem.setValue(null), lastUpdatedItem.setValue(Date.now())])
			return
		}

		const notifs = await fetchNotifications(account.id)
		await applyNotifications(notifs, await getPreviousNotifications(account.id), account.id)
	} catch (err) {
		console.error('[Modrinth Extras] Badge: Background update failed:', err)
		await setBadge(0)
	}
}
