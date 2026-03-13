<template>
	<div class="card flex-card experimental-styles-within">
		<h2>Tools</h2>
		<div class="details-list">
			<div class="details-list__item">
				<CodeIcon aria-hidden="true" />
				<a :href="modfolioUrl" target="_blank" rel="noopener" class="hover:underline">
					Generate embed
					<ExternalIcon aria-hidden="true" class="external-icon" />
				</a>
			</div>
		</div>
	</div>
	<DependencyTree v-if="projectSlug" :project-slug="projectSlug" />
</template>

<script setup lang="ts">
import { CodeIcon, ExternalIcon } from '@modrinth/assets'
import { computed } from 'vue'
import DependencyTree from './DependencyTree.vue'

const props = defineProps<{
	pageUrl: string
}>()

const modfolioUrl = computed(
	() => `https://modfolio.creeperkatze.de/?url=${encodeURIComponent(props.pageUrl)}`,
)

const projectSlug = computed(() => {
	try {
		const match = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
		)
		return match?.[2] ?? null
	} catch {
		return null
	}
})
</script>
