import { getAuthToken, usePopupFetch } from '../composables/usePopupFetch'
import { browser } from 'wxt/browser'
import { groupNotifications } from '../helpers/platform-notifications'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	// Firefox MV2 uses browserAction; Chrome MV3 uses action.
	const actionAPI = browser.action ?? (browser as any).browserAction

	async function showCachedBadge() {
		const { showBadge = true, notifications } = await browser.storage.local.get([
			'showBadge',
			'notifications',
		])
		if (!showBadge || !Array.isArray(notifications)) return
		const unread = groupNotifications(notifications.filter((n: any) => !n.read)).length
		console.log(`[Modrinth Extras] Restored cached badge: ${unread} unread`)
		await actionAPI.setBadgeBackgroundColor({ color: '#1bd96a' })
		await actionAPI.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })
	}

	async function updateBadge() {
		try {
			const { showBadge = true } = await browser.storage.local.get('showBadge')
			if (!showBadge) {
				console.log('[Modrinth Extras] Badge disabled, skipping update')
				actionAPI?.setBadgeText({ text: '' })
				return
			}

			const token = await getAuthToken()
			if (!token) {
				console.log('[Modrinth Extras] No auth token, clearing badge')
				actionAPI?.setBadgeText({ text: '' })
				await browser.storage.local.set({
					userId: null,
					notifications: null,
					lastUpdated: Date.now(),
				})
				return
			}

			const user = await usePopupFetch('user')
			if (!user?.id) {
				console.log('[Modrinth Extras] Could not fetch user, clearing badge')
				actionAPI?.setBadgeText({ text: '' })
				return
			}
			const notifs = await usePopupFetch(`user/${user.id}/notifications`)
			const unread: number = Array.isArray(notifs)
				? groupNotifications(notifs.filter((n: any) => !n.read)).length
				: 0

			console.log(
				`[Modrinth Extras] Updated badge: ${unread} unread (${Array.isArray(notifs) ? notifs.length : 0} total)`,
			)
			await actionAPI.setBadgeBackgroundColor({ color: '#1bd96a' })
			await actionAPI.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })

			await browser.storage.local.set({
				userId: user.id,
				notifications: notifs,
				lastUpdated: Date.now(),
			})
		} catch (err) {
			console.error('[Modrinth Extras] Background update failed:', err)
			actionAPI?.setBadgeText({ text: '' })
		}
	}

	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('showBadge' in changes)) return
		if (changes.showBadge.newValue === false) {
			actionAPI?.setBadgeText({ text: '' })
		} else {
			updateBadge()
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
				await actionAPI.setBadgeBackgroundColor({ color: '#1bd96a' })
				await actionAPI.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' })
				sendResponse({ ok: true })
			})()
			return true
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
