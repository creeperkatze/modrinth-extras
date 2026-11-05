<template>
	<div role="status" :aria-label="label" class="flex flex-col gap-3">
		<div
			v-for="i in count"
			:key="i"
			aria-hidden="true"
			class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
		>
			<div class="flex items-center gap-3">
				<div class="size-10 shrink-0 animate-pulse rounded-full bg-surface-4" />
				<div class="flex flex-col gap-1.5">
					<div class="h-4 w-32 animate-pulse rounded-full bg-surface-4" />
					<div class="h-3 w-20 animate-pulse rounded-full bg-surface-4" />
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<div class="h-3.5 w-full animate-pulse rounded-full bg-surface-4" />
				<div
					class="h-3.5 animate-pulse rounded-full bg-surface-4"
					:class="WIDTHS[i % WIDTHS.length]"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{ count: number; label: string }>()

// Varied line lengths make the placeholders read like real reviews.
const WIDTHS = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3']
</script>
