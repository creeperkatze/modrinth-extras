<template>
	<div class="flex flex-col gap-1 px-3 pb-2 first:pt-2">
		<p class="m-0 p-1 text-xs font-bold uppercase tracking-wide text-secondary">
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
