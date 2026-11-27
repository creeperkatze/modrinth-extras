import type { Labrinth } from '@modrinth/api-client'

import { chunkIdsForQuery } from '../../api/chunk-ids'
import { modrinthClient } from '../../api/client'
import { chunk } from '../../utils/array'

// Kept small since it's stored and sent to every context
export type NotificationExtraData = {
	project?: Pick<Labrinth.Projects.v3.Project, 'id' | 'slug' | 'name' | 'icon_url'>
	organization?: Pick<Labrinth.Organizations.v3.Organization, 'id' | 'slug' | 'name' | 'icon_url'>
	user?: Pick<Labrinth.Users.v2.User, 'id' | 'username' | 'avatar_url'>
	version?: Pick<Labrinth.Versions.v3.Version, 'id' | 'project_id'>
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

	const result: T[] = []
	for (const batch of chunkIdsForQuery(uniqueIds)) {
		try {
			result.push(...(await get(batch)))
		} catch (err) {
			console.error('[Modrinth Extras] Notifications: Failed to fetch extra data:', err)
		}
	}

	return result
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
		users: [] as string[],
		versions: [] as string[],
		organizations: [] as string[],
	}

	for (const notification of notifications) {
		if (notification.body) {
			if (notification.body.project_id) bulk.projects.push(notification.body.project_id)
			if (notification.body.version_id) bulk.versions.push(notification.body.version_id)
			if (notification.body.report_id) bulk.reports.push(notification.body.report_id)
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

	const [projects, users, organizations] = await Promise.all([
		getBulk(bulk.projects, (ids) => modrinthClient.labrinth.projects_v3.getMultiple(ids)),
		getBulk(bulk.users, (ids) => modrinthClient.labrinth.users_v2.getMultiple(ids)),
		getBulk(bulk.organizations, (ids) => modrinthClient.labrinth.organizations_v3.getMultiple(ids)),
	])

	const findProject = (id: string | undefined) => {
		const p = projects.find((x) => x.id === id)
		return p && { id: p.id, slug: p.slug, name: p.name, icon_url: p.icon_url }
	}
	const findVersion = (id: string | undefined) => {
		const v = versions.find((x) => x.id === id)
		return v && { id: v.id, project_id: v.project_id }
	}
	const findUser = (id: string | undefined) => {
		const u = users.find((x) => x.id === id)
		return u && { id: u.id, username: u.username, avatar_url: u.avatar_url }
	}
	const findOrganization = (id: string | undefined) => {
		const o = organizations.find((x) => x.id === id)
		return o && { id: o.id, slug: o.slug, name: o.name, icon_url: o.icon_url }
	}

	for (const n of notifications) {
		const extra: NotificationExtraData = {}
		if (n.body) {
			if (n.body.project_id) extra.project = findProject(n.body.project_id)
			if (n.body.organization_id) extra.organization = findOrganization(n.body.organization_id)
			if (n.body.report_id) {
				const report = reports.find((x) => x.id === n.body!.report_id)
				if (report?.item_type === 'project') extra.project = findProject(report.item_id)
				else if (report?.item_type === 'user') extra.user = findUser(report.item_id)
				else if (report?.item_type === 'version') {
					extra.version = findVersion(report.item_id)
					extra.project = findProject(extra.version?.project_id)
				}
			}
			if (n.body.version_id) extra.version = findVersion(n.body.version_id)
		}
		n.extra_data = extra
	}
	return notifications
}

export async function markNotificationsAsRead(ids: string[]): Promise<void> {
	const BATCH_SIZE = 50
	for (const batch of chunk([...new Set(ids)], BATCH_SIZE)) {
		await modrinthClient.labrinth.notifications_v2.markMultipleAsRead(batch)
	}
}
