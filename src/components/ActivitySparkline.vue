<template>
	<div
		ref="wrapperEl"
		aria-hidden="true"
		class="absolute inset-0 overflow-hidden pointer-events-none z-[-1]"
	>
		<svg
			v-if="loaded && svgWidth > 0 && svgHeight > 0"
			:viewBox="`0 0 ${svgWidth} ${svgHeight}`"
			xmlns="http://www.w3.org/2000/svg"
			:style="{ display: 'block', width: svgWidth + 'px', height: svgHeight + 'px' }"
		>
			<defs>
				<linearGradient id="me-activity-grad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--color-brand)" stop-opacity="0.15" />
					<stop offset="100%" stop-color="var(--color-brand)" stop-opacity="0" />
				</linearGradient>
			</defs>
			<template v-if="hasAnyData">
				<path
					:d="areaPath"
					fill="url(#me-activity-grad)"
					:style="{
						opacity: animated ? 1 : 0,
						transition: 'opacity 0.8s ease-out 0.6s',
					}"
				/>
				<path
					:d="linePath"
					fill="none"
					stroke="var(--color-brand)"
					stroke-opacity="0.2"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					pathLength="1"
					:style="{
						strokeDasharray: '1',
						strokeDashoffset: animated ? '0' : '1',
						transition: 'stroke-dashoffset 1.2s ease-out',
					}"
				/>
			</template>
			<line
				v-else
				x1="0"
				:y1="baseline"
				:x2="svgWidth"
				:y2="baseline"
				stroke="var(--color-brand)"
				stroke-opacity="0.2"
				stroke-width="1.5"
				pathLength="1"
				:style="{
					strokeDasharray: '1',
					strokeDashoffset: animated ? '0' : '1',
					transition: 'stroke-dashoffset 1.2s ease-out',
				}"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { apiFetch } from '../helpers/api'

const props = defineProps<{ projectSlug: string }>()

const DAYS = 60
const PAD_TOP = 10
const PAD_BOTTOM = 10
const SMOOTH_SIGMA = 0.8

interface Version {
	date_published: string
}

const dataCache = new Map<string, { counts: number[]; hasData: boolean }>()

const wrapperEl = ref<HTMLElement | null>(null)
const svgWidth = ref(0)
const svgHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

const dailyCounts = ref<number[]>(Array(DAYS).fill(0))
const hasAnyData = ref(false)
const loaded = ref(false)
const animated = ref(false)

watch(loaded, async (val) => {
	if (val) {
		await nextTick()
		window.requestAnimationFrame(() => {
			animated.value = true
		})
	}
})

function gaussianSmooth(data: number[], sigma: number): number[] {
	const radius = Math.ceil(sigma * 3)
	const kernel: number[] = []
	for (let k = -radius; k <= radius; k++) {
		kernel.push(Math.exp(-(k * k) / (2 * sigma * sigma)))
	}
	return data.map((_, i) => {
		let sum = 0
		let weight = 0
		for (let k = -radius; k <= radius; k++) {
			const j = i + k
			if (j >= 0 && j < data.length) {
				sum += data[j] * kernel[k + radius]
				weight += kernel[k + radius]
			}
		}
		return sum / weight
	})
}

onMounted(async () => {
	if (wrapperEl.value) {
		resizeObserver = new ResizeObserver((entries) => {
			svgWidth.value = entries[0].contentRect.width
			svgHeight.value = entries[0].contentRect.height
		})
		resizeObserver.observe(wrapperEl.value)
	}

	const cached = dataCache.get(props.projectSlug)
	if (cached) {
		dailyCounts.value = cached.counts
		hasAnyData.value = cached.hasData
		loaded.value = true
		// Show immediately without animation on re-mount
		animated.value = true
		return
	}

	try {
		const now = Date.now()
		const cutoff = now - DAYS * 24 * 60 * 60 * 1000

		const versions = (await apiFetch(`project/${props.projectSlug}/version?limit=100`)) as Version[]
		if (!Array.isArray(versions)) return

		const counts = Array(DAYS).fill(0)
		for (const v of versions) {
			const t = new Date(v.date_published).getTime()
			if (t < cutoff) continue
			const dayIndex = Math.floor((t - cutoff) / (24 * 60 * 60 * 1000))
			if (dayIndex >= 0 && dayIndex < DAYS) counts[dayIndex]++
		}

		dailyCounts.value = counts
		hasAnyData.value = counts.some((c) => c > 0)
		dataCache.set(props.projectSlug, { counts, hasData: hasAnyData.value })
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load activity data:', err)
	} finally {
		loaded.value = true
	}
})

onUnmounted(() => {
	resizeObserver?.disconnect()
})

const baseline = computed(() => svgHeight.value - PAD_BOTTOM)

const points = computed<[number, number][]>(() => {
	if (!hasAnyData.value || svgWidth.value <= 0 || svgHeight.value <= 0) return []
	const smoothed = gaussianSmooth(dailyCounts.value, SMOOTH_SIGMA)
	const max = Math.max(...smoothed, 1e-6)
	const w = svgWidth.value
	const bottom = baseline.value
	const range = bottom - PAD_TOP
	return smoothed.map((c, i) => [(i / (DAYS - 1)) * w, bottom - (c / max) * range])
})

function catmullRomPath(pts: [number, number][]): string {
	if (pts.length < 2) return ''
	let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
	for (let i = 1; i < pts.length; i++) {
		const p0 = pts[Math.max(0, i - 2)]
		const p1 = pts[i - 1]
		const p2 = pts[i]
		const p3 = pts[Math.min(pts.length - 1, i + 1)]
		const t = 1 / 6
		const cp1x = p1[0] + (p2[0] - p0[0]) * t
		const cp1y = p1[1] + (p2[1] - p0[1]) * t
		const cp2x = p2[0] - (p3[0] - p1[0]) * t
		const cp2y = p2[1] - (p3[1] - p1[1]) * t
		d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
	}
	return d
}

const linePath = computed(() => catmullRomPath(points.value))

const areaPath = computed(() => {
	if (!points.value.length) return ''
	const b = baseline.value.toFixed(2)
	const first = points.value[0]
	const last = points.value[points.value.length - 1]
	return `${linePath.value} L ${last[0].toFixed(2)} ${b} L ${first[0].toFixed(2)} ${b} Z`
})
</script>
