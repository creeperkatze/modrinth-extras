<template>
	<div class="relative h-full">
		<canvas ref="canvasRef" class="h-full w-full" />
	</div>
</template>

<script setup lang="ts">
// Adapted from Modrinth's website analytics chart, without its range selection and pinning
import { useCompactNumber } from '@modrinth/ui'
import {
	CategoryScale,
	Chart,
	type ChartConfiguration,
	Filler,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Tooltip,
} from 'chart.js'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { MetricKind } from '../../../../features/creator/analytics'
import { formatAxisValue } from './chart-format'

Chart.register(
	LineController,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
	Filler,
	Tooltip,
)

export interface ChartDataset {
	id: string
	label: string
	data: number[]
	color: string
	borderDash?: number[]
}

export interface ChartHoverPayload {
	visible: boolean
	x: number
	y: number
	sliceIndex: number | null
}

const props = defineProps<{
	datasets: ChartDataset[]
	labels: string[]
	metric: MetricKind
}>()

const emit = defineEmits<{
	hover: [payload: ChartHoverPayload]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const { formatCompactNumber } = useCompactNumber()

type ExternalTooltipHandler = NonNullable<
	NonNullable<NonNullable<ChartConfiguration['options']>['plugins']>['tooltip']
>['external']
type ExternalTooltipContext = Parameters<Exclude<ExternalTooltipHandler, undefined>>[0]

const X_AXIS_TICK_LIMIT = 5
const EMPTY_DATA_Y_AXIS_MAX = 10
const EMPTY_DATA_Y_AXIS_STEP = 2
const Y_AXIS_WIDTH = 44
const CSS_VARIABLE_COLOR_PATTERN = /^var\(\s*(--[a-z0-9-_]+)\s*\)$/i

// The canvas can't read CSS variables, so they are resolved to real colors first
function resolveCssColor(color: string): string {
	const variable = CSS_VARIABLE_COLOR_PATTERN.exec(color)?.[1]
	if (!variable) return color
	const resolved = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
	return resolved || color
}

function buildDatasets() {
	return props.datasets.map((dataset) => {
		const color = resolveCssColor(dataset.color)
		return {
			label: dataset.label,
			data: dataset.data,
			borderColor: color,
			backgroundColor: color,
			borderDash: dataset.borderDash,
			borderWidth: 2,
			fill: false,
			tension: 0.35,
			pointRadius: 0,
			pointBackgroundColor: color,
			pointBorderWidth: 0,
			pointHoverRadius: 4,
			pointHoverBackgroundColor: color,
			pointHoverBorderWidth: 0,
			pointHitRadius: 16,
		}
	})
}

function hasMetricData() {
	return props.datasets.some((dataset) =>
		dataset.data.some((value) => Number.isFinite(value) && value > 0),
	)
}

function buildConfig(): ChartConfiguration {
	const hasData = hasMetricData()
	return {
		type: 'line',
		data: {
			labels: props.labels,
			datasets: buildDatasets() as ChartConfiguration['data']['datasets'],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			normalized: true,
			events: ['mousemove', 'mouseout'],
			interaction: { mode: 'index', intersect: false },
			plugins: {
				legend: { display: false },
				tooltip: { enabled: false, external: handleExternalTooltip },
			},
			scales: {
				x: {
					grid: { display: false },
					ticks: {
						align: 'inner',
						maxTicksLimit: X_AXIS_TICK_LIMIT,
						maxRotation: 0,
						color: 'rgba(148, 163, 184, 0.9)',
						callback: (tickValue) => props.labels[Number(tickValue)] ?? '',
					},
					border: { color: 'rgba(148, 163, 184, 0.35)' },
				},
				y: {
					beginAtZero: true,
					afterFit: (scale) => {
						scale.width = Y_AXIS_WIDTH
					},
					...(hasData ? {} : { max: EMPTY_DATA_Y_AXIS_MAX, min: 0 }),
					grid: { color: 'rgba(148, 163, 184, 0.15)' },
					border: { display: false },
					ticks: {
						color: 'rgba(148, 163, 184, 0.9)',
						maxTicksLimit: 5,
						...(hasData ? {} : { stepSize: EMPTY_DATA_Y_AXIS_STEP }),
						callback: (tickValue, _index, ticks) => {
							const numeric =
								typeof tickValue === 'number' ? tickValue : Number.parseFloat(String(tickValue))
							if (!Number.isFinite(numeric)) return String(tickValue)
							const tickValues = ticks.map((tick) => tick.value).filter(Number.isFinite)
							return formatAxisValue(numeric, props.metric, formatCompactNumber, tickValues)
						},
					},
				},
			},
		},
	}
}

function handleExternalTooltip(context: ExternalTooltipContext) {
	const tooltip = context.tooltip
	if (!tooltip || tooltip.opacity === 0) {
		emit('hover', { visible: false, x: 0, y: 0, sliceIndex: null })
		return
	}
	emit('hover', {
		visible: true,
		x: tooltip.caretX,
		y: tooltip.caretY,
		sliceIndex: tooltip.dataPoints?.[0]?.dataIndex ?? null,
	})
}

function refreshChart() {
	if (!chartInstance) return
	const config = buildConfig()
	chartInstance.data = config.data
	chartInstance.options = config.options ?? {}
	chartInstance.update('none')
}

function handleCanvasLeave() {
	emit('hover', { visible: false, x: 0, y: 0, sliceIndex: null })
}

onMounted(() => {
	if (!canvasRef.value) return
	chartInstance = new Chart(canvasRef.value, buildConfig())
	canvasRef.value.addEventListener('mouseleave', handleCanvasLeave)
})

onBeforeUnmount(() => {
	canvasRef.value?.removeEventListener('mouseleave', handleCanvasLeave)
	chartInstance?.destroy()
	chartInstance = null
})

watch(() => [props.datasets, props.labels, props.metric], refreshChart)
</script>
