<template>
	<div
		class="flex flex-col items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-center"
	>
		<component :is="icon" v-if="icon" class="size-6 text-secondary" aria-hidden="true" />
		<h3 class="m-0 text-sm font-semibold text-contrast">{{ title }}</h3>
		<p v-if="description" class="m-0 text-xs leading-normal text-secondary">{{ description }}</p>
		<div v-if="$slots.default" class="mt-1">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
	title: string
	description?: string
	icon?: Component
}>()
</script>
