import { getAuthToken, usePopupFetch } from '../composables/usePopupFetch'
import { groupNotifications } from '../helpers/platform-notifications'

const ALARM_NAME = 'modrinth-ext-poll'
const POLL_INTERVAL_MINUTES = 1

export default defineBackground(() => {
	async function updateBadge() {
		try {
			const { showBadge = true } = await chrome.storage.local.get('showBadge')
			if (!showBadge) {
				chrome.action.setBadgeText({ text: '' })
				return
			}

			const token = await getAuthToken()
			if (!token) {
				chrome.action.setBadgeText({ text: '' })
				await chrome.storage.local.set({ userId: null, notifications: null, lastUpdated: Date.now() })
				return
			}

			const user = await usePopupFetch('user')
			const notifs = await usePopupFetch(`user/${user.id}/notifications`)
			const unread: number = groupNotifications(notifs.filter((n: any) => !n.read)).length

			await chrome.action.setBadgeText({ text: unread > 0 ? String(Math.min(unread, 99)) : '' })
			if (unread > 0) {
				await chrome.action.setBadgeBackgroundColor({ color: '#1bd96a' })
			}

			await chrome.storage.local.set({
				userId: user.id,
				notifications: notifs,
				lastUpdated: Date.now(),
			})
		} catch (err) {
			console.error('[Modrinth Extras] Background update failed:', err)
			chrome.action.setBadgeText({ text: '' })
		}
	}

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('showBadge' in changes)) return
		if (changes.showBadge.newValue === false) {
			chrome.action.setBadgeText({ text: '' })
		} else {
			updateBadge()
		}
	})

	chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLL_INTERVAL_MINUTES })

	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === ALARM_NAME) updateBadge()
	})

	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type === 'refresh') {
			updateBadge().then(() => sendResponse({ ok: true }))
			return true
		}
	})

	updateBadge()
})
