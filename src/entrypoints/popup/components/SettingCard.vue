<template>
	<div class="overflow-clip rounded-2xl border border-solid border-surface-4 bg-surface-3">
		<div class="flex items-center justify-between gap-4 p-3">
			<div class="flex min-w-0 gap-3">
				<component :is="icon" class="size-5 shrink-0 text-primary" aria-hidden="true" />
				<div class="min-w-0">
					<h3 class="m-0 text-[15px] font-semibold leading-5 text-contrast">{{ title }}</h3>
					<p
						v-if="description || $slots.description"
						class="m-0 mt-0.5 text-[13px] leading-snug text-secondary"
					>
						<slot name="description">{{ description }}</slot>
					</p>
				</div>
			</div>
			<div v-if="$slots.control" class="flex shrink-0 items-center">
				<slot name="control" />
			</div>
		</div>
		<slot />
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
	icon: Component
	title: string
	description?: string
}>()
</script>
