<template>
	<div ref="rootRef" class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div class="flex items-center gap-1">
			<button
				ref="triggerRef"
				type="button"
				:aria-label="label"
				:aria-expanded="open"
				class="size-8 shrink-0 cursor-pointer rounded-xl border border-surface-5 p-0"
				:style="{ backgroundColor: swatchColor }"
				@click="toggleOpen"
			/>
			<StyledInput v-model="text" size="small" wrapper-class="w-24" :placeholder="defaultColor" />
		</div>

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
					class="sv-area relative h-24 w-full cursor-crosshair overflow-hidden rounded-lg"
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
					class="hue-slider"
					:value="hue"
					@input="onHueInput"
				/>
			</div>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { StyledInput } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from '../../../utils/color'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

const props = withDefaults(
	defineProps<{
		label: string
		modelValue: string
		defaultColor?: string
	}>(),
	{
		defaultColor: '#1bd96a',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const text = ref(props.modelValue)
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
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
		if (newValue !== text.value) text.value = newValue
		if (internalChange) {
			internalChange = false
			return
		}
		syncFromHex(newValue || props.defaultColor)
	},
)

watch(text, (newValue) => {
	const trimmed = String(newValue ?? '').trim()
	if (HEX_COLOR_PATTERN.test(trimmed)) emit('update:modelValue', trimmed)
})

const swatchColor = computed(() =>
	HEX_COLOR_PATTERN.test(text.value) ? text.value : props.defaultColor,
)

const hueColor = computed(() => rgbToHex(...hsvToRgb(hue.value, 1, 1)))

function applyHsv() {
	internalChange = true
	text.value = rgbToHex(...hsvToRgb(hue.value, saturation.value, value.value))
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
	const trigger = triggerRef.value
	if (!trigger) return

	const rect = trigger.getBoundingClientRect()
	const viewportWidth = document.documentElement.clientWidth
	const viewportHeight = document.documentElement.clientHeight
	const margin = 8

	panelPos.value = {
		top: Math.min(rect.bottom + margin, viewportHeight - panelHeight - margin),
		left: Math.min(Math.max(rect.right - panelWidth, margin), viewportWidth - panelWidth - margin),
	}
}

function toggleOpen() {
	if (open.value) {
		open.value = false
		return
	}
	updatePosition()
	open.value = true
}

function onDocumentClick(event: MouseEvent) {
	if (!open.value) return
	const target = event.target as Node
	if (
		rootRef.value &&
		!rootRef.value.contains(target) &&
		panelRef.value &&
		!panelRef.value.contains(target)
	) {
		open.value = false
	}
}

function onWindowScroll(event: Event) {
	if (!open.value) return
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

<style scoped>
.option-field::before {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 0;
	height: 50%;
	width: 0.5rem;
	border-left: 2px solid var(--surface-5);
	border-bottom: 2px solid var(--surface-5);
	border-bottom-left-radius: 2px;
}

.option-field:not(:last-child)::after {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 50%;
	bottom: -0.5rem;
	border-left: 2px solid var(--surface-5);
}

.sv-area {
	touch-action: none;
}

.hue-slider {
	appearance: none;
	touch-action: none;
	width: 100%;
	height: 0.5rem;
	min-height: 0;
	margin: 0;
	padding: 0;
	border-radius: 9999px;
	cursor: pointer;
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
}

.hue-slider::-webkit-slider-thumb {
	appearance: none;
	width: 0.9rem;
	height: 0.9rem;
	margin-top: -0.2rem;
	border-radius: 50%;
	background: white;
	border: 2px solid rgba(0, 0, 0, 0.4);
}

.hue-slider::-moz-range-thumb {
	width: 0.9rem;
	height: 0.9rem;
	border-radius: 50%;
	background: white;
	border: 2px solid rgba(0, 0, 0, 0.4);
}
</style>
