import type { Organization, Project, Report, User, Version } from '@modrinth/utils'
import { browser } from 'wxt/browser'

import { apiFetch, type ApiFetchOptions } from './apiFetch'

export type NotificationAction = {
	title: string
	action_route: [string, string]
}

export type NotificationBody = {
	type?: string
	project_id?: string
	version_id?: string
	report_id?: string
	thread_id?: string
	invited_by?: string
	organization_id?: string
	team_id?: string
}

export type NotificationExtraData = {
	project?: Project
	organization?: Organization
	user?: User
	report?: Report
	version?: Version
	thread?: { id: string }
	invited_by?: User
}

export type Notification = {
	id: string
	user_id: string
	type:
		| 'project_update'
		| 'team_invite'
		| 'organization_invite'
		| 'status_change'
		| 'moderator_message'
	title: string
	text: string
	link: string
	read: boolean
	created: string
	actions: NotificationAction[]
	body?: NotificationBody
	extra_data?: NotificationExtraData
	grouped_notifs?: Notification[]
}

export function groupNotifications(notifications: Notification[]): Notification[] {
	if (!Array.isArray(notifications)) return []
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

async function getBulk<T extends { id: string }>(
	type: string,
	ids: string[],
	apiVersion = 2,
	options?: ApiFetchOptions,
): Promise<T[]> {
	if (!ids || ids.length === 0) return []
	const url = `${type}?ids=${encodeURIComponent(JSON.stringify([...new Set(ids)]))}`
	try {
		const res = await apiFetch(url, { apiVersion, ...options })
		return Array.isArray(res) ? res : []
	} catch {
		return []
	}
}

export async function fetchNotifications(
	userId: string,
	options?: ApiFetchOptions,
): Promise<Notification[]> {
	const result = await apiFetch(`user/${userId}/notifications`, options)
	return Array.isArray(result) ? result : []
}

export async function fetchExtraNotificationData(
	notifications: Notification[],
	options?: ApiFetchOptions,
): Promise<Notification[]> {
	if (!Array.isArray(notifications)) return []

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

	const reports = (await getBulk<Report>('reports', bulk.reports, 2, options)).filter(Boolean)
	for (const r of reports) {
		if (!r?.item_type) continue
		if (r.item_type === 'project') bulk.projects.push(r.item_id)
		else if (r.item_type === 'user') bulk.users.push(r.item_id)
		else if (r.item_type === 'version') bulk.versions.push(r.item_id)
	}

	const versions = (await getBulk<Version>('versions', bulk.versions, 2, options)).filter(Boolean)
	for (const v of versions) bulk.projects.push(v.project_id)

	const [projects, threads, users, organizations] = await Promise.all([
		getBulk<Project>('projects', bulk.projects, 2, options),
		getBulk<{ id: string }>('threads', bulk.threads, 2, options),
		getBulk<User>('users', bulk.users, 2, options),
		getBulk<Organization>('organizations', bulk.organizations, 3, options),
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

export async function markNotificationsAsRead(
	ids: string[],
	options?: ApiFetchOptions,
): Promise<void> {
	const unique = [...new Set(ids)]
	const BATCH_SIZE = 50
	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const batch = unique.slice(i, i + BATCH_SIZE)
		await apiFetch(`notifications?ids=${JSON.stringify(batch)}`, { method: 'PATCH', ...options })
	}
}

export function syncToBackground(notifications: Notification[]) {
	browser.runtime.sendMessage({ type: 'notifications-fetched', notifications }).catch(() => {})
}
