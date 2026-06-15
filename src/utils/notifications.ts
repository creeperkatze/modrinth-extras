import type { Labrinth } from '@modrinth/api-client'
import { browser } from 'wxt/browser'

import { modrinthClient } from './api'

export type NotificationExtraData = {
	project?: Labrinth.Projects.v3.Project
	organization?: Labrinth.Organizations.v3.Organization
	user?: Labrinth.Users.v2.User
	report?: Labrinth.Reports.v3.Report
	version?: Labrinth.Versions.v3.Version
	thread?: Labrinth.Threads.v3.Thread
	invited_by?: Labrinth.Users.v2.User
}

export type Notification = Labrinth.Notifications.v2.Notification & {
	extra_data?: NotificationExtraData
	grouped_notifs?: Notification[]
}

export function groupNotifications(notifications: Notification[]): Notification[] {
	const byProject = new Map<string, Notification>()
	const result: Notification[] = []

	for (const notif of notifications) {
		const key = notif.body?.project_id
		if (key) {
			const leader = byProject.get(key)
			if (leader) {
				;(leader.grouped_notifs ??= []).push(notif)
			} else {
				const copy = { ...notif }
				byProject.set(key, copy)
				result.push(copy)
			}
		} else {
			result.push(notif)
		}
	}

	return result
}

async function getBulk<T>(ids: string[], get: (uniqueIds: string[]) => Promise<T[]>): Promise<T[]> {
	const uniqueIds = [...new Set(ids)]
	if (uniqueIds.length === 0) return []
	try {
		return await get(uniqueIds)
	} catch {
		return []
	}
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
	return modrinthClient.labrinth.notifications_v2.getUserNotifications(userId)
}

export async function fetchExtraNotificationData(
	notifications: Notification[],
): Promise<Notification[]> {
	const bulk = {
		projects: [] as string[],
		reports: [] as string[],
		threads: [] as string[],
		users: [] as string[],
		versions: [] as string[],
		organizations: [] as string[],
	}

	for (const notification of notifications) {
		if (notification.body) {
			if (notification.body.project_id) bulk.projects.push(notification.body.project_id)
			if (notification.body.version_id) bulk.versions.push(notification.body.version_id)
			if (notification.body.report_id) bulk.reports.push(notification.body.report_id)
			if (notification.body.thread_id) bulk.threads.push(notification.body.thread_id)
			if (notification.body.invited_by) bulk.users.push(notification.body.invited_by)
			if (notification.body.organization_id)
				bulk.organizations.push(notification.body.organization_id)
		}
	}

	const reports = await getBulk(bulk.reports, (ids) =>
		modrinthClient.labrinth.reports_v3.getMultiple(ids),
	)
	for (const r of reports) {
		if (!r?.item_type) continue
		if (r.item_type === 'project') bulk.projects.push(r.item_id)
		else if (r.item_type === 'user') bulk.users.push(r.item_id)
		else if (r.item_type === 'version') bulk.versions.push(r.item_id)
	}

	const versions = await getBulk(bulk.versions, (ids) =>
		modrinthClient.labrinth.versions_v3.getVersions(ids),
	)
	for (const v of versions) bulk.projects.push(v.project_id)

	const [projects, threads, users, organizations] = await Promise.all([
		getBulk(bulk.projects, (ids) => modrinthClient.labrinth.projects_v3.getMultiple(ids)),
		getBulk(bulk.threads, (ids) => modrinthClient.labrinth.threads_v3.getMultiple(ids)),
		getBulk(bulk.users, (ids) => modrinthClient.labrinth.users_v2.getMultiple(ids)),
		getBulk(bulk.organizations, (ids) => modrinthClient.labrinth.organizations_v3.getMultiple(ids)),
	])

	for (const n of notifications) {
		n.extra_data = {} as NotificationExtraData
		if (n.body) {
			if (n.body.project_id)
				n.extra_data.project = projects.find((x) => x.id === n.body!.project_id)
			if (n.body.organization_id)
				n.extra_data.organization = organizations.find((x) => x.id === n.body!.organization_id)
			if (n.body.report_id) {
				n.extra_data.report = reports.find((x) => x.id === n.body!.report_id)
				const t = n.extra_data.report?.item_type
				if (t === 'project')
					n.extra_data.project = projects.find((x) => x.id === n.extra_data?.report?.item_id)
				else if (t === 'user')
					n.extra_data.user = users.find((x) => x.id === n.extra_data?.report?.item_id)
				else if (t === 'version') {
					n.extra_data.version = versions.find((x) => x.id === n.extra_data?.report?.item_id)
					n.extra_data.project = projects.find((x) => x.id === n.extra_data?.version?.project_id)
				}
			}
			if (n.body.thread_id) n.extra_data.thread = threads.find((x) => x.id === n.body!.thread_id)
			if (n.body.invited_by)
				n.extra_data.invited_by = users.find((x) => x.id === n.body!.invited_by)
			if (n.body.version_id)
				n.extra_data.version = versions.find((x) => x.id === n.body!.version_id)
		}
	}
	return notifications
}

export async function markNotificationsAsRead(ids: string[]): Promise<void> {
	const unique = [...new Set(ids)]
	const BATCH_SIZE = 50
	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const batch = unique.slice(i, i + BATCH_SIZE)
		await modrinthClient.labrinth.notifications_v2.markMultipleAsRead(batch)
	}
}

export function syncToBackground(notifications: Notification[]) {
	browser.runtime.sendMessage({ type: 'notifications-fetched', notifications }).catch(() => {})
}
