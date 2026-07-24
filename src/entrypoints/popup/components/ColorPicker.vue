<template>
	<Teleport to="body">
		<div
			v-if="open"
			ref="panelRef"
			class="fixed z-50 flex flex-col gap-2 rounded-xl border border-solid border-surface-5 bg-surface-2 p-2 shadow-lg"
			:style="{ top: `${panelPos.top}px`, left: `${panelPos.left}px`, width: `${panelWidth}px` }"
			@click.stop
		>
			<div
				ref="svRef"
				class="relative h-24 w-full touch-none cursor-crosshair overflow-hidden rounded-lg"
				:style="{ backgroundColor: hueColor }"
				@pointerdown="onSvPointerDown"
				@pointermove="onSvPointerMove"
			>
				<div
					class="pointer-events-none absolute inset-0"
					style="background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0))"
				/>
				<div
					class="pointer-events-none absolute inset-0"
					style="background: linear-gradient(to top, #000, rgba(0, 0, 0, 0))"
				/>
				<div
					class="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
					:style="{ left: `${saturation * 100}%`, top: `${(1 - value) * 100}%` }"
				/>
			</div>
			<input
				type="range"
				min="0"
				max="360"
				step="1"
				class="m-0 h-2 min-h-0 w-full cursor-pointer touch-none appearance-none rounded-full p-0 [&::-moz-range-thumb]:h-[0.9rem] [&::-moz-range-thumb]:w-[0.9rem] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-black/40 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:-mt-[0.2rem] [&::-webkit-slider-thumb]:h-[0.9rem] [&::-webkit-slider-thumb]:w-[0.9rem] [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-black/40 [&::-webkit-slider-thumb]:bg-white"
				style="
					background: linear-gradient(
						to right,
						#ff0000 0%,
						#ffff00 17%,
						#00ff00 33%,
						#00ffff 50%,
						#0000ff 67%,
						#ff00ff 83%,
						#ff0000 100%
					);
				"
				:value="hue"
				@input="onHueInput"
			/>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from '../../../utils/color'

const props = withDefaults(
	defineProps<{
		modelValue: string
		defaultColor?: string
		anchorEl: HTMLElement | null
		open: boolean
	}>(),
	{
		defaultColor: '#1bd96a',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
	'update:open': [value: boolean]
}>()

const panelRef = ref<HTMLElement | null>(null)
const svRef = ref<HTMLElement | null>(null)

const panelWidth = 208
const panelHeight = 156
const panelPos = ref({ top: 0, left: 0 })

const hue = ref(0)
const saturation = ref(0)
const value = ref(0)

function syncFromHex(hex: string) {
	const rgb = hexToRgb(hex)
	if (!rgb) return
	const [h, s, v] = rgbToHsv(...rgb)
	hue.value = h
	saturation.value = s
	value.value = v
}

syncFromHex(props.modelValue || props.defaultColor)

// Skip re-deriving hue from our own hex changes, since hue is undefined for grayscale hex values.
let internalChange = false

watch(
	() => props.modelValue,
	(newValue) => {
		if (internalChange) {
			internalChange = false
			return
		}
		syncFromHex(newValue || props.defaultColor)
	},
)

watch(
	() => props.open,
	(newValue) => {
		if (newValue) updatePosition()
	},
)

const hueColor = computed(() => rgbToHex(...hsvToRgb(hue.value, 1, 1)))

function applyHsv() {
	internalChange = true
	emit('update:modelValue', rgbToHex(...hsvToRgb(hue.value, saturation.value, value.value)))
}

function updateFromPointer(event: PointerEvent) {
	const el = svRef.value
	if (!el) return
	const rect = el.getBoundingClientRect()
	const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
	const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
	saturation.value = rect.width === 0 ? 0 : x / rect.width
	value.value = rect.height === 0 ? 0 : 1 - y / rect.height
	applyHsv()
}

function onSvPointerDown(event: PointerEvent) {
	;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	updateFromPointer(event)
}

function onSvPointerMove(event: PointerEvent) {
	if (event.buttons !== 1) return
	updateFromPointer(event)
}

function onHueInput(event: Event) {
	hue.value = Number((event.target as HTMLInputElement).value)
	applyHsv()
}

function updatePosition() {
	const anchor = props.anchorEl
	if (!anchor) return

	const rect = anchor.getBoundingClientRect()
	const viewportWidth = document.documentElement.clientWidth
	const viewportHeight = document.documentElement.clientHeight
	const margin = 8

	panelPos.value = {
		top: Math.min(rect.bottom + margin, viewportHeight - panelHeight - margin),
		left: Math.min(Math.max(rect.right - panelWidth, margin), viewportWidth - panelWidth - margin),
	}
}

function onDocumentClick(event: MouseEvent) {
	if (!props.open) return
	const target = event.target as Node
	if (
		props.anchorEl &&
		!props.anchorEl.contains(target) &&
		panelRef.value &&
		!panelRef.value.contains(target)
	) {
		emit('update:open', false)
	}
}

function onWindowScroll(event: Event) {
	if (!props.open) return
	if (panelRef.value && event.target instanceof Node && panelRef.value.contains(event.target))
		return
	updatePosition()
}

onMounted(() => {
	document.addEventListener('click', onDocumentClick)
	window.addEventListener('scroll', onWindowScroll, true)
	window.addEventListener('resize', updatePosition)
})
onBeforeUnmount(() => {
	document.removeEventListener('click', onDocumentClick)
	window.removeEventListener('scroll', onWindowScroll, true)
	window.removeEventListener('resize', updatePosition)
})
</script>
