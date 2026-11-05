<template>
	<div
		aria-hidden="true"
		class="flex flex-col gap-4 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<div class="h-9 w-14 animate-pulse rounded-xl bg-surface-4" />
			<div class="flex flex-col gap-1.5">
				<div class="h-5 w-28 animate-pulse rounded-full bg-surface-4" />
				<div class="h-4 w-20 animate-pulse rounded-full bg-surface-4" />
			</div>
		</div>
		<div v-if="categories" class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
			<div v-for="i in 3" :key="i" class="h-4 w-24 animate-pulse rounded-full bg-surface-4" />
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{ categories?: boolean }>()
</script>
