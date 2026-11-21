<template>
	<button
		type="button"
		class="m-0 flex h-full min-w-0 appearance-none flex-col gap-2.5 rounded-2xl border border-solid p-3 text-left transition-colors"
		:class="
			active
				? 'cursor-default border-brand bg-brand-highlight'
				: 'cursor-pointer border-surface-5 bg-surface-3 hover:bg-surface-4 active:scale-95'
		"
		@click="emit('click')"
	>
		<div class="flex w-full items-center justify-between gap-2">
			<div class="min-w-0 truncate text-sm font-medium text-primary">{{ label }}</div>
			<component
				:is="icon"
				aria-hidden="true"
				class="size-5 shrink-0"
				:class="active ? 'text-brand' : 'text-primary'"
			/>
		</div>

		<div class="flex min-w-0 flex-col gap-1.5">
			<div class="w-fit max-w-full truncate text-xl font-semibold leading-none text-contrast">
				{{ value }}
			</div>
			<div
				v-if="change"
				class="flex items-center gap-1 text-xs font-semibold"
				:class="{
					'text-green': trend > 0,
					'text-red': trend < 0,
					'text-primary': trend === 0,
				}"
			>
				<component :is="trendIcon" v-if="trend !== 0" aria-hidden="true" class="size-3" />
				{{ change }}
			</div>
		</div>
	</button>
</template>

<script setup lang="ts">
// Adapted from the stat cards of Modrinth's website analytics dashboard
import { TrendingDownIcon, TrendingUpIcon } from '@modrinth/assets'
import { type Component, computed } from 'vue'

const props = defineProps<{
	label: string
	value: string
	icon: Component
	// Already formatted, like "+12.5%"
	change: string | null
	trend: number
	active?: boolean
}>()

const emit = defineEmits<{
	click: []
}>()

const trendIcon = computed(() => (props.trend >= 0 ? TrendingUpIcon : TrendingDownIcon))
</script>
