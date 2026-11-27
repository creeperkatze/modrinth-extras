import { storage } from '@wxt-dev/storage'

import { groupNotifications, type Notification } from './notifications'

export interface StoredNotifications {
	// Another account's notifications can't serve as the baseline
	userId: string
	notifications: Notification[]
	// When each was marked as read here, so an older fetch can't bring it back
	dismissed?: Record<string, number>
}

const OLD_USER_ID_KEY = 'local:userId'

// Only the background writes it
export const notificationsItem = storage.defineItem<StoredNotifications | null>(
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

// Long enough for the request marking them as read to finish
const DISMISS_GRACE_MS = 30_000

export function withRead(
	stored: StoredNotifications,
	ids: string[],
	read: boolean,
	now = Date.now(),
): StoredNotifications {
	const idSet = new Set(ids)
	const dismissed = { ...stored.dismissed }
	for (const id of ids) {
		if (read) dismissed[id] = now
		else delete dismissed[id]
	}
	return {
		...stored,
		dismissed,
		notifications: stored.notifications.map((n) => (idSet.has(n.id) ? { ...n, read } : n)),
	}
}

export function withFetched(
	stored: StoredNotifications | null,
	userId: string,
	fetched: Notification[],
	fetchStartedAt: number,
): StoredNotifications {
	const previous = stored?.userId === userId ? (stored.dismissed ?? {}) : {}
	const dismissed = Object.fromEntries(
		Object.entries(previous).filter(([, at]) => at > fetchStartedAt - DISMISS_GRACE_MS),
	)
	return {
		userId,
		dismissed,
		notifications: fetched.map((n) => (!n.read && n.id in dismissed ? { ...n, read: true } : n)),
	}
}

export function unreadNotifications(
	stored: StoredNotifications | null,
	userId: string | null | undefined,
): Notification[] | null {
	if (!userId || stored?.userId !== userId) return null
	return groupNotifications(stored.notifications.filter((n) => !n.read))
}
