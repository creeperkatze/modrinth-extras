import type { Organization, Project, Report, User, Version } from '@modrinth/utils'

import { useBaseFetch } from '../composables/useBaseFetch'

type Fetcher = (url: string, options?: RequestInit & { apiVersion?: number }) => Promise<any>

export type PlatformNotificationAction = {
	title: string
	action_route: [string, string]
}

export type PlatformNotificationBody = {
	type?: string
	project_id?: string
	version_id?: string
	report_id?: string
	thread_id?: string
	invited_by?: string
	organization_id?: string
	team_id?: string
}

export type PlatformNotificationExtraData = {
	project?: Project
	organization?: Organization
	user?: User
	report?: Report
	version?: Version
	thread?: { id: string }
	invited_by?: User
}

export type PlatformNotification = {
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
	actions: PlatformNotificationAction[]
	body?: PlatformNotificationBody
	extra_data?: PlatformNotificationExtraData
	grouped_notifs?: PlatformNotification[]
}

async function getBulk<T extends { id: string }>(
	type: string,
	ids: string[],
	fetcher: Fetcher,
	apiVersion = 2,
): Promise<T[]> {
	if (!ids || ids.length === 0) {
		return []
	}
	const url = `${type}?ids=${encodeURIComponent(JSON.stringify([...new Set(ids)]))}`
	try {
		const res = await fetcher(url, { apiVersion })
		return Array.isArray(res) ? res : []
	} catch {
		return []
	}
}

export async function fetchExtraNotificationData(
	notifications: PlatformNotification[],
	fetcher: Fetcher = useBaseFetch,
): Promise<PlatformNotification[]> {
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

	const reports = (await getBulk<Report>('reports', bulk.reports, fetcher)).filter(Boolean)
	for (const r of reports) {
		if (!r?.item_type) continue
		if (r.item_type === 'project') bulk.projects.push(r.item_id)
		else if (r.item_type === 'user') bulk.users.push(r.item_id)
		else if (r.item_type === 'version') bulk.versions.push(r.item_id)
	}

	const versions = (await getBulk<Version>('versions', bulk.versions, fetcher)).filter(Boolean)
	for (const v of versions) bulk.projects.push(v.project_id)

	const [projects, threads, users, organizations] = await Promise.all([
		getBulk<Project>('projects', bulk.projects, fetcher),
		getBulk<{ id: string }>('threads', bulk.threads, fetcher),
		getBulk<User>('users', bulk.users, fetcher),
		getBulk<Organization>('organizations', bulk.organizations, fetcher, 3),
	])

	for (const n of notifications) {
		n.extra_data = {} as PlatformNotificationExtraData
		if (n.body) {
			if (n.body.project_id)
				n.extra_data.project = projects.find((x) => x.id === n.body!.project_id)
			if (n.body.organization_id)
				n.extra_data.organization = organizations.find((x) => x.id === n.body!.organization_id)
			if (n.body.report_id) {
				n.extra_data.report = reports.find((x) => x.id === n.body!.report_id)
				const t = n.extra_data.report?.item_type
				if (t === 'project')
					n.extra_data.project = projects.find(
						(x) => x.id === n.extra_data?.report?.item_id,
					)
				else if (t === 'user')
					n.extra_data.user = users.find(
						(x) => x.id === n.extra_data?.report?.item_id,
					)
				else if (t === 'version') {
					n.extra_data.version = versions.find(
						(x) => x.id === n.extra_data?.report?.item_id,
					)
					n.extra_data.project = projects.find(
						(x) => x.id === n.extra_data?.version?.project_id,
					)
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

export function groupNotifications(notifications: PlatformNotification[]): PlatformNotification[] {
	const grouped: PlatformNotification[] = []
	for (let i = 0; i < notifications.length; i++) {
		const current = notifications[i]
		const next = notifications[i + 1]
		if (current.body && i < notifications.length - 1 && isSimilar(current, next)) {
			const groupCopy = { ...current, grouped_notifs: [next] }
			let j = i + 2
			while (j < notifications.length && isSimilar(current, notifications[j])) {
				groupCopy.grouped_notifs.push(notifications[j])
				j++
			}
			grouped.push(groupCopy)
			i = j - 1
		} else {
			grouped.push(current)
		}
	}
	return grouped
}

function isSimilar(a: PlatformNotification, b: PlatformNotification | undefined): boolean {
	return !!a?.body?.project_id && a.body!.project_id === b?.body?.project_id
}

export async function markAsRead(
	ids: string[],
	fetcher: Fetcher = useBaseFetch,
): Promise<void> {
	await fetcher(`notifications?ids=${JSON.stringify([...new Set(ids)])}`, { method: 'PATCH' })
}
