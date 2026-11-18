<template>
	<Teleport to="body">
		<div
			v-show="visible"
			ref="tooltipElement"
			class="pointer-events-none fixed left-0 top-0 z-[9999] flex max-w-[220px] flex-col overflow-hidden rounded-lg border border-solid border-surface-5 bg-surface-3 py-2 text-sm shadow-lg"
			:style="positionStyle"
		>
			<div
				class="mb-1.5 border-0 border-b border-solid border-surface-5 px-3 pb-1.5 font-medium text-contrast"
			>
				<span class="block truncate">{{ title }}</span>
			</div>
			<div class="flex flex-col px-3">
				<div v-if="total" class="flex items-center justify-between gap-4">
					<span class="font-medium text-primary">{{ totalLabel }}</span>
					<span class="font-semibold text-contrast">{{ total }}</span>
				</div>
				<div
					v-for="entry in entries"
					:key="entry.id"
					class="flex w-full min-w-0 items-center justify-between gap-4 text-primary"
				>
					<span class="inline-flex min-w-0 items-center gap-1.5 py-0.5">
						<span
							:class="
								entry.isPreviousPeriod
									? 'h-0 w-2 rounded-none border-0 border-t-2 border-dashed bg-transparent'
									: 'size-2 rounded-full'
							"
							class="shrink-0"
							:style="
								entry.isPreviousPeriod
									? { borderColor: entry.color }
									: { backgroundColor: entry.color }
							"
						/>
						<span class="min-w-0 truncate">{{ entry.name }}</span>
					</span>
					<span
						class="shrink-0"
						:class="
							entry.isPreviousPeriod ? 'font-medium text-secondary' : 'font-semibold text-contrast'
						"
					>
						{{ entry.value }}
					</span>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
// Styled after the tooltip of Modrinth's website analytics chart
import { computed, nextTick, ref, watch } from 'vue'

export interface ChartTooltipEntry {
	id: string
	name: string
	color: string
	value: string
	isPreviousPeriod?: boolean
}

const props = defineProps<{
	visible: boolean
	// Relative to the chart, which is at anchor on the page
	x: number
	y: number
	anchor: DOMRect | null
	title: string
	totalLabel: string
	total: string | null
	entries: ChartTooltipEntry[]
}>()

const CURSOR_OFFSET = 12
const EDGE_PADDING = 4

const tooltipElement = ref<HTMLElement | null>(null)
const tooltipSize = ref({ width: 0, height: 0 })

watch(
	() => [props.visible, props.entries, props.title],
	() =>
		nextTick(() => {
			tooltipSize.value = {
				width: tooltipElement.value?.offsetWidth ?? 0,
				height: tooltipElement.value?.offsetHeight ?? 0,
			}
		}),
	{ deep: true },
)

function clamp(value: number, size: number, limit: number): number {
	return Math.max(EDGE_PADDING, Math.min(value, limit - size - EDGE_PADDING))
}

// Placed in the page itself so nothing clips it, and kept inside the popup on every side
const positionStyle = computed(() => {
	if (!props.anchor) return {}
	const { width, height } = tooltipSize.value
	const cursorX = props.anchor.left + props.x
	const cursorY = props.anchor.top + props.y
	const fitsRight = cursorX + CURSOR_OFFSET + width <= window.innerWidth - EDGE_PADDING
	const left = fitsRight ? cursorX + CURSOR_OFFSET : cursorX - width - CURSOR_OFFSET
	const top = cursorY - height / 2
	return {
		transform: `translate(${clamp(left, width, window.innerWidth)}px, ${clamp(top, height, window.innerHeight)}px)`,
	}
})
</script>
