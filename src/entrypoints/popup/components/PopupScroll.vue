<template>
	<ScrollablePanel
		class="min-h-0 flex-1 [&>.scrollable-pane-wrapper]:h-full [&__.scrollable-pane]:max-h-none [&__.scrollable-pane]:!gap-0 [&__.scrollable-pane]:pt-3 [&__.wrapper-wrapper]:overflow-visible"
	>
		<div class="flex flex-col gap-4 px-3 pb-3">
			<slot />
		</div>
	</ScrollablePanel>
</template>

<script setup lang="ts">
import { ScrollablePanel } from '@modrinth/ui'
</script>
