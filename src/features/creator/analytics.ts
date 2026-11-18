import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'

export type MetricKind = 'downloads' | 'views' | 'revenue'

export const METRIC_KINDS: MetricKind[] = ['downloads', 'views', 'revenue']

export interface CreatorProject {
	id: string
	name: string
	downloads: number
}

type MetricValues = Record<MetricKind, number>
type MetricSeries = Record<MetricKind, number[]>

// One value per day, oldest first, for the range and the same length of time before it.
export interface AnalyticsRange extends AnalyticsSeries {
	days: number
	projects: Record<string, AnalyticsSeries>
}

export interface AnalyticsSeries {
	daily: MetricSeries
	previousDaily: MetricSeries
	totals: MetricValues
	previousTotals: MetricValues
}

// The website sends at most this many projects per analytics request
const PROJECT_IDS_PER_REQUEST = 40

export async function fetchCreatorProjects(userId: string): Promise<CreatorProject[]> {
	const projects = await modrinthClient.request<Labrinth.Projects.v3.Project[]>(
		`/user/${userId}/projects`,
		{ api: 'labrinth', version: 3 },
	)
	return projects.map((project) => ({
		id: project.id,
		name: project.name,
		downloads: project.downloads,
	}))
}

function emptyValues(): MetricValues {
	return { downloads: 0, views: 0, revenue: 0 }
}

function emptySeries(length: number): MetricSeries {
	return {
		downloads: Array.from({ length }, () => 0),
		views: Array.from({ length }, () => 0),
		revenue: Array.from({ length }, () => 0),
	}
}

function pointValue(point: Labrinth.Analytics.v3.AnalyticsData): number {
	switch (point.metric_kind) {
		case 'downloads':
			return point.downloads
		case 'views':
			return point.views
		case 'revenue': {
			const value = Number.parseFloat(point.revenue)
			return Number.isFinite(value) ? value : 0
		}
		default:
			return 0
	}
}

function isTrackedMetric(kind: string): kind is MetricKind {
	return (METRIC_KINDS as string[]).includes(kind)
}

export async function fetchAnalyticsRange(
	projectIds: string[],
	days: number,
): Promise<AnalyticsRange> {
	const slices = days * 2
	const end = new Date()
	const start = new Date(end.getTime() - slices * 24 * 60 * 60_000)

	const batches: string[][] = []
	for (let i = 0; i < projectIds.length; i += PROJECT_IDS_PER_REQUEST) {
		batches.push(projectIds.slice(i, i + PROJECT_IDS_PER_REQUEST))
	}

	const responses = await Promise.all(
		batches.map((batch) =>
			modrinthClient.labrinth.analytics_v3.fetch({
				time_range: {
					start: start.toISOString(),
					end: end.toISOString(),
					resolution: { slices },
				},
				project_ids: batch,
				return_metrics: {
					project_downloads: { bucket_by: ['project_id'] },
					project_views: { bucket_by: ['project_id'] },
					project_revenue: { bucket_by: ['project_id'] },
				},
			}),
		),
	)

	const range: AnalyticsRange = {
		days,
		daily: emptySeries(days),
		previousDaily: emptySeries(days),
		totals: emptyValues(),
		previousTotals: emptyValues(),
		projects: {},
	}

	for (const response of responses) {
		response.metrics.forEach((slice, sliceIndex) => {
			// The first half of the slices is the period before the range
			const day = sliceIndex - days
			for (const point of slice) {
				if (!isTrackedMetric(point.metric_kind)) continue
				const kind = point.metric_kind
				const value = pointValue(point)
				const project = (range.projects[point.source_project] ??= {
					daily: emptySeries(days),
					previousDaily: emptySeries(days),
					totals: emptyValues(),
					previousTotals: emptyValues(),
				})
				for (const series of [range, project]) {
					if (day < 0) {
						series.previousDaily[kind][sliceIndex] =
							(series.previousDaily[kind][sliceIndex] ?? 0) + value
						series.previousTotals[kind] += value
					} else {
						series.daily[kind][day] = (series.daily[kind][day] ?? 0) + value
						series.totals[kind] += value
					}
				}
			}
		})
	}

	return range
}
