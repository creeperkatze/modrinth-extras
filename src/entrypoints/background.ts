import { browser } from 'wxt/browser'

import {
	applyNotifications,
	notificationsItem,
	setBadge,
	showCachedBadge,
	updateBadge,
} from '../background/badge'
import { handleNotificationClick } from '../background/desktop-notifications'
import { detectBrowserLocale } from '../utils/i18n'
import type { Notification } from '../utils/notifications'
import { getSettings } from '../utils/settings'
import { capture, initTelemetry } from '../utils/telemetry'

const ALARM_NAME = 'modrinth-extras-poll'
const POLL_INTERVAL_MINUTES = 5

export default defineBackground(() => {
	void (async () => {
		await initTelemetry()
		const settings = await getSettings()
		capture('extension_started', {
			...settings,
			locale: settings.locale.value || detectBrowserLocale(),
		})
	})()

	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !('settings' in changes)) return
		const newSettings = changes.settings?.newValue as
			| { notificationBadge?: { enabled?: boolean } }
			| undefined
		const oldSettings = changes.settings?.oldValue as
			| { notificationBadge?: { enabled?: boolean } }
			| undefined
		if (newSettings?.notificationBadge?.enabled !== oldSettings?.notificationBadge?.enabled) {
			if (newSettings?.notificationBadge?.enabled === false) void setBadge(0)
			else updateBadge()
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
		if (message.type === 'notifications-fetched') {
			const newNotifs = message.notifications as Notification[]
			;(async () => {
				const prevNotifs = await notificationsItem.getValue()
				await applyNotifications(newNotifs, prevNotifs)
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
