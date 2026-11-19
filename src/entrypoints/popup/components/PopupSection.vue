<template>
	<section class="flex flex-col gap-2">
		<div class="flex min-h-8 items-center justify-between gap-2 px-1">
			<h2 class="m-0 flex items-center gap-2 text-sm font-semibold text-contrast">
				<component :is="icon" v-if="icon" class="size-4 shrink-0 text-primary" aria-hidden="true" />
				{{ title }}
			</h2>
			<div v-if="$slots.actions" class="flex shrink-0 items-center gap-1">
				<slot name="actions" />
			</div>
		</div>
		<div v-if="bare" class="flex flex-col gap-2">
			<slot />
		</div>
		<div
			v-else
			class="flex flex-col overflow-clip rounded-2xl border border-solid border-surface-4 bg-surface-3 [&>*+*]:border-0 [&>*+*]:border-t [&>*+*]:border-solid [&>*+*]:border-surface-4"
		>
			<slot />
		</div>
	</section>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
	title: string
	icon?: Component
	// For content that brings its own cards
	bare?: boolean
}>()
</script>
