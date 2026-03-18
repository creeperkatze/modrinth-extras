import { browser } from 'wxt/browser'

import { getAuthToken, usePopupFetch } from '../composables/usePopupFetch'
import { groupNotifications, type PlatformNotification } from '../helpers/platform-notifications'
import { sendDesktopNotifications } from './desktop-notifications'

export async function setBadge(unread: number) {
	await browser.action.setBadgeBackgroundColor({ color: '#1bd96a' })
	await browser.action.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })
}

export async function showCachedBadge() {
	const { showBadge = true, notifications } = await browser.storage.local.get([
		'showBadge',
		'notifications',
	])
	if (!showBadge || !Array.isArray(notifications)) return
	const unread = groupNotifications(
		(notifications as PlatformNotification[]).filter((n) => !n.read),
	).length
	console.log(`[Modrinth Extras] Restored cached badge: ${unread} unread`)
	await setBadge(unread)
}

export async function applyNotifications(
	newNotifs: PlatformNotification[],
	prevNotifs: PlatformNotification[] | null,
	userId?: string,
) {
	const { showBadge = true } = await browser.storage.local.get('showBadge')
	const unread = groupNotifications(newNotifs.filter((n) => !n.read)).length
	console.log(`[Modrinth Extras] Applying ${newNotifs.length} notifications: ${unread} unread`)
	if (showBadge) {
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
		const { showBadge = true, notifications: prevNotifs } = await browser.storage.local.get([
			'showBadge',
			'notifications',
		])
		if (!showBadge) {
			browser.action?.setBadgeText({ text: '' })
			return
		}

		const token = await getAuthToken()
		if (!token) {
			console.log('[Modrinth Extras] Badge: No auth token, clearing badge')
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
			console.log('[Modrinth Extras] Badge: Could not fetch user, clearing badge')
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
		console.error('[Modrinth Extras] Badge: Background update failed:', err)
		browser.action?.setBadgeText({ text: '' })
	}
}
