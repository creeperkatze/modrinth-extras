<template>
	<div class="flex flex-col gap-1 px-2 py-3">
		<p class="m-0 px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-secondary">
			<slot name="label">{{ label }}</slot>
		</p>
		<slot />
	</div>
</template>

<script setup lang="ts">
defineProps<{
	label: string
}>()
</script>
