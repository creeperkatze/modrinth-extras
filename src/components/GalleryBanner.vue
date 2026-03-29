<template>
	<div
		v-if="imageUrl"
		class="fixed top-0 left-0 z-[1] h-screen w-screen overflow-hidden pointer-events-none"
		aria-hidden="true"
	>
		<img
			:src="imageUrl"
			alt=""
			class="h-full w-full scale-110 object-cover object-top opacity-50"
			:style="{ filter: 'blur(8px)' }"
			@load="onLoad"
		/>
		<div class="gallery-banner-fade absolute inset-0" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { apiFetch } from '../helpers/apiFetch'

const props = defineProps<{ projectSlug: string }>()

interface GalleryImage {
	url: string
	featured: boolean
	title?: string
	description?: string
	created: string
	ordering: number
}

interface Project {
	gallery: GalleryImage[]
}

const imageCache = new Map<string, string | null>()

const imageUrl = ref<string | null>(null)

let stackingStyleId = 'modrinth-extras-gallery-banner-stacking'

function injectStackingStyle() {
	if (document.getElementById(stackingStyleId)) return
	const el = document.createElement('style')
	el.id = stackingStyleId
	el.textContent = `
		.layout > main,
		.layout > footer {
			position: relative;
			z-index: 2;
		}
	`
	document.head.appendChild(el)
}

function removeStackingStyle() {
	document.getElementById(stackingStyleId)?.remove()
}

function onLoad() {
	injectStackingStyle()
}

onUnmounted(() => {
	removeStackingStyle()
})

onMounted(async () => {
	const cached = imageCache.get(props.projectSlug)
	if (cached !== undefined) {
		imageUrl.value = cached
		if (cached) injectStackingStyle()
		return
	}

	try {
		const project = (await apiFetch(`project/${props.projectSlug}`)) as Project
		if (!Array.isArray(project.gallery) || project.gallery.length === 0) {
			imageCache.set(props.projectSlug, null)
			return
		}

		const featured = project.gallery.find((img) => img.featured)
		const url = featured?.url ?? project.gallery[0].url
		imageCache.set(props.projectSlug, url)
		imageUrl.value = url
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load gallery banner:', err)
		imageCache.set(props.projectSlug, null)
	}
})
</script>

<style scoped>
.gallery-banner-fade {
	background: linear-gradient(to bottom, transparent 60%, var(--color-bg) 80%);
}
</style>
