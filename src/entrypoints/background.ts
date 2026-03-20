import { browser } from 'wxt/browser'

import { applyNotifications, setBadge, showCachedBadge, updateBadge } from '../background/badge'
import { handleNotificationClick } from '../background/desktop-notifications'
import type { PlatformNotification } from '../helpers/platform-notifications'
import { loadSettings } from '../helpers/settings'
import { capture, initTelemetry } from '../helpers/telemetry'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	void initTelemetry()
	void loadSettings().then((settings) => {
		capture('extension_started', { ...settings })
	})

	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('showBadge' in changes)) return
		if (changes.showBadge.newValue === false) {
			void setBadge(0)
		} else {
			updateBadge()
		}
	})

	browser.notifications?.onClicked.addListener(handleNotificationClick)
	browser.permissions.onAdded.addListener((permissions) => {
		if (permissions.permissions?.includes('notifications')) {
			browser.notifications.onClicked.addListener(handleNotificationClick)
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
				void setBadge(count)
				sendResponse({ ok: true })
			})()
			return true
		}
		if (message.type === 'popup_opened') {
			capture('popup_opened', message as Record<string, unknown>)
			return
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

	browser.runtime.onInstalled.addListener((details) => {
		if (details.reason === 'install') {
			capture('extension_installed')
		} else if (details.reason === 'update') {
			capture('extension_updated', { from_extension_version: details.previousVersion })
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
