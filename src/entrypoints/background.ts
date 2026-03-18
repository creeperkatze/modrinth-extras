import { browser } from 'wxt/browser'

import { applyNotifications, showCachedBadge, updateBadge } from '../background/badge'
import { handleNotificationClick } from '../background/desktop-notifications'
import type { PlatformNotification } from '../helpers/platform-notifications'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('showBadge' in changes)) return
		if (changes.showBadge.newValue === false) {
			browser.action?.setBadgeText({ text: '' })
		} else {
			updateBadge()
		}
	})

	browser.notifications.onClicked.addListener(handleNotificationClick)

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
				await browser.action.setBadgeBackgroundColor({ color: '#1bd96a' })
				await browser.action.setBadgeText({ text: count > 0 ? String(Math.min(count, 99)) : '' })
				sendResponse({ ok: true })
			})()
			return true
		}
		if (message.type === 'notifications-fetched') {
			const newNotifs = message.notifications as PlatformNotification[]
			;(async () => {
				const { notifications: prevNotifs } = await browser.storage.local.get('notifications')
				await applyNotifications(
					newNotifs,
					Array.isArray(prevNotifs) ? (prevNotifs as PlatformNotification[]) : null,
				)
			})()
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
