<template>
	<div class="w-[300px]">
		<header class="flex items-center gap-3 px-4 py-3.5">
			<img src="/icon-48.png" alt="" class="size-9 shrink-0 rounded-lg" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold text-contrast">Modrinth Extras</span>
				<span class="text-xs text-secondary">v{{ version }}</span>
			</div>
		</header>

		<HorizontalRule />

		<div class="flex flex-col gap-2 px-4 py-3">
			<p class="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
				Notifications
			</p>

			<div class="flex items-start justify-between gap-4">
				<SettingsLabel
					id="toggle-badge"
					title="Show count on icon"
					description="Display unread notification count as a badge on the extension icon"
				/>
				<button
					id="toggle-badge"
					type="button"
					role="switch"
					:aria-checked="showBadge"
					class="relative m-0 inline-flex h-5 w-[38px] shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors duration-200"
					:class="showBadge ? 'bg-brand' : 'bg-button-bg'"
					@click="showBadge = !showBadge"
				>
					<span
						class="absolute left-0.5 top-0.5 size-4 rounded-full transition-[transform,background-color] duration-200"
						:class="showBadge ? 'translate-x-[18px] bg-black/85' : 'bg-gray-400'"
					/>
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { HorizontalRule, SettingsLabel } from '@modrinth/ui'
import { onMounted, ref, watch } from 'vue'

const version = browser.runtime.getManifest().version

const showBadge = ref(true)

onMounted(async () => {
	const stored = await chrome.storage.local.get('showBadge')
	if (typeof stored.showBadge === 'boolean') {
		showBadge.value = stored.showBadge
	}
})

watch(showBadge, (value) => {
	chrome.storage.local.set({ showBadge: value })
})
</script>
