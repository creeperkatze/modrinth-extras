import { browser } from 'wxt/browser'

import { markNotificationsAsRead, type Notification } from './notifications'
import { acceptTeamInvite, removeSelfFromTeam } from './teams'

function groupedIds(notification: Notification): string[] {
	return [notification.id, ...(notification.grouped_notifs?.map((n) => n.id) ?? [])]
}

interface NotificationActionsOptions {
	userId: () => string | null | undefined
	// Hides the notifications right away instead of waiting for the API
	dismiss: (ids: string[]) => void
	unreadCount: () => number
}

export function useNotificationActions(options: NotificationActionsOptions) {
	function dismiss(ids: string[]) {
		options.dismiss(ids)
		browser.runtime
			.sendMessage({ type: 'badge-count', count: options.unreadCount() })
			.catch(() => {})
	}

	async function markAsRead(notifications: Notification[]) {
		const ids = notifications.flatMap(groupedIds)
		if (ids.length === 0) return
		dismiss(ids)
		try {
			await markNotificationsAsRead(ids)
		} catch (err) {
			console.error('[Modrinth Extras] Failed to mark notifications as read:', err)
		}
	}

	async function acceptInvite(notification: Notification) {
		dismiss([notification.id])
		try {
			await acceptTeamInvite(notification.body.team_id as string)
			await markNotificationsAsRead([notification.id])
		} catch (err) {
			console.error('[Modrinth Extras] Failed to accept the invite:', err)
		}
	}

	async function declineInvite(notification: Notification) {
		const userId = options.userId()
		if (!userId) return
		dismiss([notification.id])
		try {
			await removeSelfFromTeam(notification.body.team_id as string, userId)
			await markNotificationsAsRead([notification.id])
		} catch (err) {
			console.error('[Modrinth Extras] Failed to decline the invite:', err)
		}
	}

	return { markAsRead, acceptInvite, declineInvite }
}
