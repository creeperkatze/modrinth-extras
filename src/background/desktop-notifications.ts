import { browser } from 'wxt/browser'

import { getBackgroundAuthToken } from '../helpers/api'
import {
	fetchExtraNotificationData,
	groupNotifications,
	type Notification,
} from '../helpers/notifications'
import { getSettings } from '../helpers/settings'

// Maps notification ID to the relative link so the click handler can open the right page
export const notificationLinks = new Map<string, string>()

export async function sendDesktopNotifications(
	newNotifs: Notification[],
	prevNotifs: Notification[] | null,
) {
	const { desktopNotifications } = await getSettings()
	if (!desktopNotifications.enabled) return

	// No prior state means this is the first run, save baseline without notifying
	if (prevNotifs === null) {
		console.log(
			'[Modrinth Extras] Desktop notifications: First run, saving baseline without notifying',
		)
		return
	}

	const prevIds = new Set(prevNotifs.map((n) => n.id))
	const brandNew = newNotifs.filter((n) => !n.read && !prevIds.has(n.id))
	if (brandNew.length === 0) {
		console.log('[Modrinth Extras] Desktop notifications: No new notifications')
		return
	}

	console.log(
		`[Modrinth Extras] Desktop notifications: ${brandNew.length} new, fetching extra data`,
	)
	const token = await getBackgroundAuthToken()
	await fetchExtraNotificationData(brandNew, { token })

	const grouped = groupNotifications(brandNew)
	console.log(
		`[Modrinth Extras] Desktop notifications: Sending ${grouped.length} notification(s) (${brandNew.length} raw, ${grouped.length} grouped)`,
	)

	for (const notif of grouped) {
		const groupSize = (notif.grouped_notifs?.length ?? 0) + 1
		const iconUrl =
			notif.extra_data?.project?.icon_url ??
			notif.extra_data?.organization?.icon_url ??
			notif.extra_data?.user?.avatar_url ??
			browser.runtime.getURL('/icon-128.png')
		const title =
			notif.type === 'project_update' && notif.extra_data?.project
				? `${notif.extra_data.project.title} has been updated${groupSize > 1 ? ` (${groupSize} new versions)` : ''}`
				: notif.title
		const message = notif.text
		console.log(
			`[Modrinth Extras] Desktop notification: "${title}" (id: ${notif.id}, group size: ${groupSize})`,
		)
		notificationLinks.set(notif.id, notif.link)
		await browser.notifications.create(notif.id, {
			type: 'basic',
			iconUrl,
			title,
			message,
		})
	}
}

export async function handleNotificationClick(notifId: string) {
	const link = notificationLinks.get(notifId)
	if (!link) return
	notificationLinks.delete(notifId)
	await browser.notifications.clear(notifId)
	const path = link.startsWith('http') ? new URL(link).pathname : link
	const url = `https://modrinth.com${path}`
	const [existing] = await browser.tabs.query({ url: 'https://modrinth.com/*' })
	if (existing?.id != null) {
		await browser.tabs.sendMessage(existing.id, { type: 'navigate', path })
		await browser.tabs.update(existing.id, { active: true })
		if (existing.windowId != null)
			await browser.windows.update(existing.windowId, { focused: true })
	} else {
		await browser.tabs.create({ url })
	}
}
