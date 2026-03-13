<template>
	<div class="popup-root">
		<header class="popup-header">
			<img src="/icon-48.png" alt="" class="popup-logo" aria-hidden="true" />
			<div class="flex flex-col gap-0.5">
				<span class="text-sm font-semibold text-contrast">Modrinth Extras</span>
				<span class="text-xs text-secondary">v{{ version }}</span>
			</div>
		</header>

		<HorizontalRule />

		<div class="popup-body">
			<p class="popup-section-heading">Notifications</p>

			<div class="popup-row">
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
					class="toggle"
					:class="showBadge ? 'toggle--on' : 'toggle--off'"
					@click="showBadge = !showBadge"
				>
					<span class="toggle__knob" />
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

<style scoped>
.popup-root {
	width: 300px;
	background-color: var(--color-bg);
	color: var(--color-base);
}

.popup-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.875rem 1rem;
}

.popup-logo {
	width: 2.25rem;
	height: 2.25rem;
	border-radius: 0.5rem;
	flex-shrink: 0;
}

.popup-body {
	padding: 0.75rem 1rem;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.popup-section-heading {
	margin: 0 0 0.25rem;
	font-size: 0.6875rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-secondary);
}

.popup-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
}

.toggle {
	flex-shrink: 0;
	position: relative;
	display: inline-flex;
	align-items: center;
	width: 38px;
	height: 20px;
	border-radius: 9999px;
	border: none;
	margin: 0;
	padding: 0;
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.toggle--on {
	background-color: var(--color-brand);
}

.toggle--off {
	background-color: var(--color-button-bg);
}

.toggle__knob {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 16px;
	height: 16px;
	border-radius: 9999px;
	background-color: var(--color-gray-400);
	transition:
		transform 0.2s ease,
		background-color 0.2s ease;
}

.toggle--on .toggle__knob {
	transform: translateX(18px);
	background-color: rgba(0, 0, 0, 0.85);
}
</style>
