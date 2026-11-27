import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { browser } from 'wxt/browser'

import { markNotificationsAsRead, type Notification } from './notifications'
import { notificationsItem, type StoredNotifications, unreadNotifications, withRead } from './store'
import { acceptTeamInvite, removeSelfFromTeam } from './teams'

function groupedIds(notification: Notification): string[] {
	return [notification.id, ...(notification.grouped_notifs?.map((n) => n.id) ?? [])]
}

export function useNotifications(userId: () => string | null | undefined) {
	const stored = shallowRef<StoredNotifications | null>(null)
	const loaded = ref(false)
	const refreshing = ref(false)
	const failed = ref(false)

	let changed = false
	const unwatch = notificationsItem.watch((value) => {
		changed = true
		stored.value = value
		loaded.value = true
	})
	onScopeDispose(unwatch)
	notificationsItem
		.getValue()
		.then((value) => {
			if (!changed) stored.value = value
		})
		.catch((err) => console.error('[Modrinth Extras] Failed to load the notifications:', err))
		.finally(() => (loaded.value = true))

	const unread = computed(() => unreadNotifications(stored.value, userId()))

	async function refresh(maxAge = 0) {
		if (refreshing.value) return
		refreshing.value = true
		failed.value = false
		try {
			const response = await browser.runtime.sendMessage({ type: 'refresh-notifications', maxAge })
			failed.value = !response?.ok
		} catch (err) {
			failed.value = true
			console.error('[Modrinth Extras] Failed to refresh the notifications:', err)
		} finally {
			refreshing.value = false
		}
	}

	function setRead(ids: string[], read: boolean) {
		const id = userId()
		if (!id) return
		if (stored.value?.userId === id) stored.value = withRead(stored.value, ids, read)
		browser.runtime
			.sendMessage({ type: 'set-notifications-read', userId: id, ids, read })
			.catch((err) =>
				console.error('[Modrinth Extras] Failed to sync the read notifications:', err),
			)
	}

	async function dismissWhile(ids: string[], action: () => Promise<void>, description: string) {
		setRead(ids, true)
		try {
			await action()
		} catch (err) {
			console.error(`[Modrinth Extras] Failed to ${description}:`, err)
			setRead(ids, false)
		}
	}

	async function markAsRead(notifications: Notification[]) {
		const ids = notifications.flatMap(groupedIds)
		if (ids.length === 0) return
		await dismissWhile(ids, () => markNotificationsAsRead(ids), 'mark notifications as read')
	}

	async function acceptInvite(notification: Notification) {
		await dismissWhile(
			[notification.id],
			async () => {
				await acceptTeamInvite(notification.body.team_id as string)
				await markNotificationsAsRead([notification.id])
			},
			'accept the invite',
		)
	}

	async function declineInvite(notification: Notification) {
		const id = userId()
		if (!id) return
		await dismissWhile(
			[notification.id],
			async () => {
				await removeSelfFromTeam(notification.body.team_id as string, id)
				await markNotificationsAsRead([notification.id])
			},
			'decline the invite',
		)
	}

	return { unread, loaded, refreshing, failed, refresh, markAsRead, acceptInvite, declineInvite }
}
