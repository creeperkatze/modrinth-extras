<template>
	<div
		v-if="imageUrl"
		class="absolute top-0 left-0 -z-10 h-screen w-screen overflow-hidden pointer-events-none"
		aria-hidden="true"
	>
		<img
			:src="imageUrl"
			alt=""
			class="h-full w-full scale-110 object-cover object-top"
			:style="{
				filter: 'blur(8px)',
				opacity: animated ? 0.5 : 0,
				transition: 'opacity 0.5s ease-out',
			}"
			@load="onLoad"
		/>
		<div class="gallery-background-fade absolute inset-0" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { apiFetch } from '../helpers/api'

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

const imageUrl = ref<string | null>(null)
const animated = ref(false)

function onLoad() {
	window.requestAnimationFrame(() => {
		animated.value = true
	})
}

onMounted(async () => {
	try {
		const project = (await apiFetch(`project/${props.projectSlug}`)) as Project
		if (!Array.isArray(project.gallery) || project.gallery.length === 0) return

		const featured = project.gallery.find((img) => img.featured)
		imageUrl.value = featured?.url ?? project.gallery[0].url
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load gallery background:', err)
	}
})
</script>

<style scoped>
.gallery-background-fade {
	background: linear-gradient(to bottom, transparent 80%, var(--color-bg) 100%);
}
</style>
