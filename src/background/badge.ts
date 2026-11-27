import { browser } from 'wxt/browser'

import { getSettings } from '../core/settings'
import { accountItem } from '../features/account/account'
import {
	fetchExtraNotificationData,
	fetchNotifications,
	type Notification,
} from '../features/notifications/notifications'
import {
	lastUpdatedItem,
	notificationsItem,
	type StoredNotifications,
	unreadNotifications,
	withFetched,
	withRead,
} from '../features/notifications/store'
import { sendBrowserNotifications } from './notifications'

export async function setBadge(unread: number) {
	const action = browser.action ?? browser.browserAction

	await action.setBadgeBackgroundColor({ color: '#1bd96a' })
	await action.setBadgeText({ text: unread > 0 ? String(unread) : '' })
}

async function showBadge(stored: StoredNotifications | null) {
	const { notificationBadge } = await getSettings()
	const unread = unreadNotifications(stored, stored?.userId)?.length ?? 0
	await setBadge(notificationBadge.enabled ? unread : 0)
}

export async function syncBadge() {
	await showBadge(await notificationsItem.getValue())
}

let writes: Promise<unknown> = Promise.resolve()

// One change at a time, so a slow fetch can't overwrite a newer one
function updateStored(
	change: (stored: StoredNotifications | null) => StoredNotifications | null | undefined,
): Promise<void> {
	const run = writes.then(async () => {
		const previous = await notificationsItem.getValue()
		const next = change(previous)
		// Every change is sent to every open tab, so an unchanged fetch isn't saved
		if (next === undefined || JSON.stringify(next) === JSON.stringify(previous)) return
		await notificationsItem.setValue(next)
		await showBadge(next)
		if (!next) return
		try {
			await sendBrowserNotifications(
				next.notifications,
				previous?.userId === next.userId ? previous.notifications : null,
			)
		} catch (err) {
			console.error('[Modrinth Extras] Failed to send browser notifications:', err)
		}
	})
	writes = run.catch(() => {})
	return run
}

export function setNotificationsRead(userId: string, ids: string[], read: boolean) {
	return updateStored((stored) =>
		stored?.userId === userId ? withRead(stored, ids, read) : undefined,
	)
}

function hasExtraData(notification: Notification): boolean {
	const { extra_data: extra, body } = notification
	if (!extra) return false
	return (
		(!body?.project_id || !!extra.project) &&
		(!body?.organization_id || !!extra.organization) &&
		(!body?.version_id || !!extra.version)
	)
}

async function fetchAndStore(maxAge: number) {
	const account = await accountItem.getValue()
	if (!account) {
		console.log('[Modrinth Extras] Notifications: Signed out, cleared them')
		await updateStored((stored) => (stored ? null : undefined))
		return
	}

	const [stored, lastUpdated] = await Promise.all([
		notificationsItem.getValue(),
		lastUpdatedItem.getValue(),
	])
	const isSameAccount = stored?.userId === account.id
	const known = isSameAccount ? stored.notifications : []
	if (maxAge > 0 && isSameAccount && lastUpdated && Date.now() - lastUpdated < maxAge) return

	const startedAt = Date.now()
	const fetched = await fetchNotifications(account.id)

	const knownById = new Map(known.map((n) => [n.id, n]))
	const missing: Notification[] = []
	for (const notification of fetched) {
		if (notification.read) continue
		const previous = knownById.get(notification.id)
		if (previous && hasExtraData(previous)) notification.extra_data = previous.extra_data
		else missing.push(notification)
	}
	await fetchExtraNotificationData(missing)

	await updateStored((current) => withFetched(current, account.id, fetched, startedAt))
	await lastUpdatedItem.setValue(Date.now())
	console.log(
		`[Modrinth Extras] Notifications: Fetched ${fetched.length}, extra data for ${missing.length}`,
	)
}

let pending: Promise<void> | null = null

export function refreshNotifications(maxAge = 0): Promise<void> {
	pending ??= fetchAndStore(maxAge).finally(() => (pending = null))
	return pending
}

export async function pollNotifications() {
	try {
		const { notificationBadge, desktopNotifications } = await getSettings()
		// Signing out still clears them
		const account = await accountItem.getValue()
		if (account && !notificationBadge.enabled && !desktopNotifications.enabled) return
		await refreshNotifications()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to poll the notifications:', err)
	}
}

// The popup used to keep its own copy of the notifications
export async function removeOldNotificationCache() {
	const all = await browser.storage.local.get(null)
	const keys = Object.keys(all).filter((key) => key.startsWith('popupCache:notifications:'))
	if (keys.length > 0) await browser.storage.local.remove(keys)
}
