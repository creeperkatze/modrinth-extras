<template>
	<div class="flex flex-col gap-4 px-3 pb-3">
		<SignInCard
			v-if="accountLoaded && !account"
			:description="formatMessage(messages['popup.creator.signIn'])"
		/>

		<template v-else-if="account">
			<div
				v-if="!projects && projectsLoading"
				class="flex items-center justify-center gap-2 p-6 text-sm text-secondary"
			>
				<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
				{{ formatMessage(messages['popup.creator.loading']) }}
			</div>

			<template v-else-if="projects">
				<EmptyState
					v-if="!hasProjects"
					type="no-documents"
					:heading="formatMessage(messages['popup.creator.noProjectsTitle'])"
					:description="formatMessage(messages['popup.creator.noProjectsDescription'])"
				>
					<template #actions>
						<Button type="colored" color="brand" @click="openModrinth('/dashboard/projects')">
							<PlusIcon aria-hidden="true" />
							{{ formatMessage(messages['popup.creator.createProject']) }}
						</Button>
					</template>
				</EmptyState>

				<PopupSection v-else :title="formatMessage(messages['popup.creator.analytics'])" bare>
					<template #actions>
						<Tabs v-model:value="days" :tabs="rangeTabs" class="shrink-0" />
						<IconButton
							v-tooltip="formatMessage(messages['popup.creator.fullAnalytics'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.creator.fullAnalytics'])"
							@click="openModrinth('/dashboard/analytics')"
						>
							<ArrowUpRightIcon aria-hidden="true" />
						</IconButton>
					</template>

					<div class="grid grid-cols-3 gap-2">
						<StatCard
							v-for="card in statCards"
							:key="card.metric"
							:label="card.label"
							:value="card.value"
							:icon="card.icon"
							:change="card.change"
							:trend="card.trend"
							:active="metric === card.metric"
							@click="metric = card.metric"
						/>
					</div>

					<div class="rounded-2xl border border-solid border-surface-4 bg-surface-3 p-2">
						<div ref="plotElement" class="relative h-[180px] select-none">
							<template v-if="range">
								<AnalyticsChart
									:datasets="chartDatasets"
									:labels="chartLabels"
									:metric="metric"
									@hover="onChartHover"
								/>
								<div
									v-if="hover.visible"
									aria-hidden="true"
									class="pointer-events-none absolute bottom-0 left-0 top-0 z-10 mb-[1.8rem] mt-2.5 border-0 border-l border-solid border-contrast opacity-25"
									:style="{ transform: `translate(${hover.x}px, 0)` }"
								/>
								<AnalyticsChartTooltip
									:visible="hover.visible && hover.sliceIndex !== null"
									:x="hover.x"
									:y="hover.y"
									:anchor="plotRect"
									:title="hover.sliceIndex !== null ? (chartLabels[hover.sliceIndex] ?? '') : ''"
									:total-label="formatMessage(messages['popup.creator.total'])"
									:total="tooltipTotal"
									:entries="tooltipEntries"
								/>
							</template>
							<div
								v-else-if="rangeFailed"
								class="flex h-full items-center justify-center text-sm text-secondary"
							>
								{{ formatMessage(messages['popup.creator.failed']) }}
							</div>
							<div v-else class="flex h-full items-center justify-center">
								<SpinnerIcon class="size-5 animate-spin text-secondary" aria-hidden="true" />
							</div>
						</div>
					</div>
				</PopupSection>

				<PopupSection
					v-if="balance && (hasProjects || hasRevenue)"
					:title="formatMessage(messages['popup.creator.revenue'])"
					bare
				>
					<template #actions>
						<IconButton
							v-tooltip="formatMessage(messages['popup.creator.fullRevenue'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.creator.fullRevenue'])"
							@click="openModrinth('/dashboard/revenue')"
						>
							<ArrowUpRightIcon aria-hidden="true" />
						</IconButton>
					</template>
					<RevenueCard :balance="balance" />
				</PopupSection>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	CurrencyIcon,
	DownloadIcon,
	EyeIcon,
	PlusIcon,
	SpinnerIcon,
} from '@modrinth/assets'
import {
	Button,
	defineMessages,
	IconButton,
	Tabs,
	useCompactNumber,
	useFormatMoney,
	useFormatNumber,
	useVIntl,
} from '@modrinth/ui'
import { computed, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { i18n } from '../../../core/i18n/i18n'
import {
	type CreatorProject,
	fetchAnalyticsRange,
	fetchCreatorProjects,
	type MetricKind,
} from '../../../features/creator/analytics'
import { fetchRevenueBalance } from '../../../features/creator/revenue'
import { daysBefore } from '../../../utils/time'
import AnalyticsChart, {
	type ChartDataset,
	type ChartHoverPayload,
} from '../components/creator/AnalyticsChart.vue'
import AnalyticsChartTooltip, {
	type ChartTooltipEntry,
} from '../components/creator/AnalyticsChartTooltip.vue'
import RevenueCard from '../components/creator/RevenueCard.vue'
import StatCard from '../components/creator/StatCard.vue'
import EmptyState from '../components/EmptyState.vue'
import PopupSection from '../components/PopupSection.vue'
import SignInCard from '../components/SignInCard.vue'
import { useCachedResource } from '../composables/cached'
import { account, accountLoaded } from '../state/account'
import { openModrinth } from '../utils/tabs'

const CACHE_MAX_AGE = 15 * 60_000
const RANGE_STORAGE_KEY = 'popup-creator-range'
const RANGES = [7, 30, 90]
const CHART_PROJECT_LIMIT = 8
// Above this the website shows the raw difference instead of a percentage
const MAX_PERCENT_DISPLAY = 999
const PREVIOUS_PERIOD_ID = 'previous-period'
const PREVIOUS_PERIOD_BORDER_DASH = [6, 4]

// The same line colors as Modrinth's analytics dashboard
const LIGHT_PALETTE = [
	'hsl(152, 100%, 34%)',
	'hsl(41, 79%, 46%)',
	'hsl(203, 76%, 64%)',
	'hsl(0, 93%, 62%)',
	'hsl(143, 66%, 29%)',
	'hsl(58, 89%, 25%)',
	'hsl(311, 64%, 49%)',
	'hsl(198, 91%, 32%)',
]
const DARK_PALETTE = [
	'hsl(145, 78%, 48%)',
	'hsl(41, 79%, 46%)',
	'hsl(203, 76%, 64%)',
	'hsl(0, 93%, 62%)',
	'hsl(143, 66%, 29%)',
	'hsl(58, 94%, 45%)',
	'hsl(311, 64%, 49%)',
	'hsl(198, 91%, 32%)',
]

const { formatMessage } = useVIntl()
const { formatCompactNumber } = useCompactNumber()
const formatNumber = useFormatNumber()
const formatMoney = useFormatMoney()

const messages = defineMessages({
	'popup.creator.signIn': {
		id: 'popup.creator.signIn',
		defaultMessage: 'Sign in to see your analytics and revenue here.',
	},
	'popup.creator.loading': {
		id: 'popup.creator.loading',
		defaultMessage: 'Loading your projects...',
	},
	'popup.creator.noProjectsTitle': {
		id: 'popup.creator.noProjectsTitle',
		defaultMessage: 'No projects yet',
	},
	'popup.creator.noProjectsDescription': {
		id: 'popup.creator.noProjectsDescription',
		defaultMessage: 'Once you publish a project, its views, downloads and revenue show up here.',
	},
	'popup.creator.createProject': {
		id: 'popup.creator.createProject',
		defaultMessage: 'Create a project',
	},
	'popup.creator.analytics': {
		id: 'popup.creator.analytics',
		defaultMessage: 'Analytics',
	},
	'popup.creator.fullAnalytics': {
		id: 'popup.creator.fullAnalytics',
		defaultMessage: 'Open full analytics',
	},
	'popup.creator.fullRevenue': {
		id: 'popup.creator.fullRevenue',
		defaultMessage: 'Open full revenue',
	},
	'popup.creator.views': {
		id: 'popup.creator.views',
		defaultMessage: 'Views',
	},
	'popup.creator.downloads': {
		id: 'popup.creator.downloads',
		defaultMessage: 'Downloads',
	},
	'popup.creator.revenue': {
		id: 'popup.creator.revenue',
		defaultMessage: 'Revenue',
	},
	'popup.creator.total': {
		id: 'popup.creator.total',
		defaultMessage: 'Total',
	},
	'popup.creator.previousPeriod': {
		id: 'popup.creator.previousPeriod',
		defaultMessage: 'Previous period',
	},
	'popup.creator.failed': {
		id: 'popup.creator.failed',
		defaultMessage: 'Analytics could not be loaded',
	},
	'popup.creator.rangeDays': {
		id: 'popup.creator.rangeDays',
		defaultMessage: '{days}d',
	},
})

function savedRange(): number {
	try {
		const saved = Number(localStorage.getItem(RANGE_STORAGE_KEY))
		return RANGES.includes(saved) ? saved : 30
	} catch {
		return 30
	}
}

const days = ref(savedRange())
watch(days, (value) => {
	try {
		localStorage.setItem(RANGE_STORAGE_KEY, String(value))
	} catch {
		// Remembering the range is optional
	}
})

const metric = ref<MetricKind>('downloads')

const rangeTabs = computed(() =>
	RANGES.map((value) => ({
		value,
		label: formatMessage(messages['popup.creator.rangeDays'], { days: value }),
	})),
)

const { data: projects, loading: projectsLoading } = useCachedResource<CreatorProject[]>(
	() => (account.value ? `creator-projects:${account.value.id}` : null),
	() => fetchCreatorProjects(account.value!.id),
	CACHE_MAX_AGE,
)

const projectIds = computed(() => projects.value?.map((project) => project.id) ?? [])
const hasProjects = computed(() => projectIds.value.length > 0)

const { data: range, failed: rangeFailed } = useCachedResource(
	() =>
		account.value && hasProjects.value ? `analytics-range:${account.value.id}:${days.value}` : null,
	() => fetchAnalyticsRange(projectIds.value, days.value),
	CACHE_MAX_AGE,
)

// Organization members can earn revenue without owning a project themselves
const { data: balance } = useCachedResource(
	() => (account.value ? `revenue:${account.value.id}` : null),
	fetchRevenueBalance,
	CACHE_MAX_AGE,
)

const hasRevenue = computed(
	() => !!balance.value && balance.value.available + balance.value.pending > 0,
)

const metricLabels = computed<Record<MetricKind, string>>(() => ({
	views: formatMessage(messages['popup.creator.views']),
	downloads: formatMessage(messages['popup.creator.downloads']),
	revenue: formatMessage(messages['popup.creator.revenue']),
}))

function formatMetric(value: number, kind: MetricKind = metric.value): string {
	return kind === 'revenue' ? formatMoney(value) : formatNumber(Math.round(value))
}

function formatMetricCompact(value: number, kind: MetricKind): string {
	return kind === 'revenue' ? formatMoney(value) : formatCompactNumber(Math.round(value))
}

// Same rules as the website: a percentage, unless there is nothing to compare against
function formatComparison(now: number, before: number, kind: MetricKind) {
	if (before === 0 && now === 0) return { change: '0%', trend: 0 }
	if (before !== 0) {
		const percent = ((now - before) / before) * 100
		if (Math.abs(percent) <= MAX_PERCENT_DISPLAY) {
			const rounded = Math.round(percent * 10) / 10
			if (rounded === 0) return { change: '0%', trend: 0 }
			return { change: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`, trend: rounded }
		}
	}
	const difference = now - before
	const sign = difference > 0 ? '+' : difference < 0 ? '-' : ''
	return { change: `${sign}${formatMetricCompact(Math.abs(difference), kind)}`, trend: difference }
}

const STAT_ICONS = { views: EyeIcon, downloads: DownloadIcon, revenue: CurrencyIcon }

const statCards = computed(() =>
	(['views', 'downloads', 'revenue'] as MetricKind[]).map((kind) => {
		const now = range.value?.totals[kind] ?? 0
		const before = range.value?.previousTotals[kind] ?? 0
		return {
			metric: kind,
			label: metricLabels.value[kind],
			icon: STAT_ICONS[kind],
			value: range.value ? formatMetricCompact(now, kind) : '…',
			...(range.value ? formatComparison(now, before, kind) : { change: null, trend: 0 }),
		}
	}),
)

const palette = !document.documentElement.classList.contains('light-mode')
	? DARK_PALETTE
	: LIGHT_PALETTE

// Colors follow lifetime downloads, so a project keeps its color when the metric changes
const projectColors = computed(() => {
	const ordered = [...(projects.value ?? [])].sort((a, b) => b.downloads - a.downloads)
	return new Map(ordered.map((project, index) => [project.id, palette[index % palette.length]!]))
})

function projectColor(id: string): string {
	return projectColors.value.get(id) ?? palette[0]!
}

function rangeValue(project: CreatorProject): number {
	return range.value?.projects[project.id]?.totals[metric.value] ?? 0
}

const chartLabels = computed(() => {
	const formatter = new Intl.DateTimeFormat(i18n.global.locale.value, {
		month: 'short',
		day: 'numeric',
	})
	return Array.from({ length: days.value }, (_, index) => {
		const daysAgo = days.value - 1 - index
		return formatter.format(daysBefore(Date.now(), daysAgo))
	})
})

const chartDatasets = computed<ChartDataset[]>(() => {
	const current = range.value
	if (!current) return []
	const kind = metric.value
	const empty = Array.from({ length: current.days }, () => 0)

	// A single project gets the dashed previous period line, like the website's comparison mode
	const onlyProject = projects.value?.length === 1 ? projects.value[0] : null
	if (onlyProject) {
		const series = current.projects[onlyProject.id]
		const color = projectColor(onlyProject.id)
		return [
			{ id: onlyProject.id, label: onlyProject.name, data: series?.daily[kind] ?? empty, color },
			{
				id: PREVIOUS_PERIOD_ID,
				label: formatMessage(messages['popup.creator.previousPeriod']),
				data: series?.previousDaily[kind] ?? empty,
				color,
				borderDash: PREVIOUS_PERIOD_BORDER_DASH,
			},
		]
	}

	return [...(projects.value ?? [])]
		.sort((a, b) => rangeValue(b) - rangeValue(a) || b.downloads - a.downloads)
		.slice(0, CHART_PROJECT_LIMIT)
		.map((project) => ({
			id: project.id,
			label: project.name,
			data: current.projects[project.id]?.daily[kind] ?? empty,
			color: projectColor(project.id),
		}))
})

const plotElement = useTemplateRef<HTMLElement>('plotElement')
const plotRect = shallowRef<DOMRect | null>(null)
const hover = reactive<ChartHoverPayload>({ visible: false, x: 0, y: 0, sliceIndex: null })

function onChartHover(payload: ChartHoverPayload) {
	Object.assign(hover, payload)
	plotRect.value = plotElement.value?.getBoundingClientRect() ?? null
}

const tooltipEntries = computed<ChartTooltipEntry[]>(() => {
	const index = hover.sliceIndex
	if (index === null) return []
	return chartDatasets.value.map((dataset) => ({
		id: dataset.id,
		name: dataset.label,
		color: dataset.color,
		value: formatMetric(dataset.data[index] ?? 0),
		isPreviousPeriod: dataset.id === PREVIOUS_PERIOD_ID,
	}))
})

// Counts projects outside the chart's top lines too, so it matches the stat card
const tooltipTotal = computed(() => {
	const index = hover.sliceIndex
	if (index === null || !range.value || chartDatasets.value.length < 2) return null
	if (chartDatasets.value.some((dataset) => dataset.id === PREVIOUS_PERIOD_ID)) return null
	return formatMetric(range.value.daily[metric.value][index] ?? 0)
})
</script>
