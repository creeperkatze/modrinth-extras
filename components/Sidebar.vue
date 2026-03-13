<template>
	<div v-if="showTools" class="card flex-card experimental-styles-within">
		<h2>Tools</h2>
		<div class="details-list">
			<div class="details-list__item">
				<CodeIcon aria-hidden="true" />
				<a :href="modfolioUrl" target="_blank" rel="noopener" class="hover:underline">
					Generate embed
					<ExternalIcon aria-hidden="true" class="external-icon" />
				</a>
			</div>
			<div v-if="apiUrl" class="details-list__item">
				<BracesIcon aria-hidden="true" />
				<a
					:href="apiUrl"
					target="_blank"
					rel="noopener"
					class="min-w-0 flex-1 truncate hover:underline"
				>
					View API response
					<ExternalIcon aria-hidden="true" class="external-icon" />
				</a>
			</div>
			<template v-if="projectSlug">
				<div v-if="downloadLoading || downloadUrl" class="details-list__item">
					<DownloadIcon aria-hidden="true" class="shrink-0" />
					<LoaderCircleIcon v-if="downloadLoading" class="animate-spin shrink-0 text-secondary" />
					<button
						v-else-if="downloadUrl"
						class="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-primary hover:underline"
						style="font: inherit"
						:aria-label="downloadCopied ? 'Copied!' : 'Copy download URL'"
						@click="copyDownloadUrl"
					>
						{{ downloadCopied ? 'Copied!' : 'Copy download URL' }}
					</button>
					<ClipboardCopyIcon v-if="!downloadLoading && downloadUrl && !downloadCopied" class="shrink-0 text-secondary" />
					<CheckIcon v-else-if="downloadCopied" class="shrink-0 text-brand" />
				</div>
				<div class="details-list__item">
					<BoxIcon aria-hidden="true" class="shrink-0" />
					<button
						class="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-primary hover:underline"
						style="font: inherit"
						:aria-label="packwizCopied ? 'Copied!' : 'Copy packwiz command'"
						@click="copyPackwiz"
					>
						{{ packwizCopied ? 'Copied!' : 'Copy packwiz' }}
					</button>
					<ClipboardCopyIcon v-if="!packwizCopied" class="shrink-0 text-secondary" />
					<CheckIcon v-else class="shrink-0 text-brand" />
				</div>
			</template>
		</div>
	</div>
	<DependencyTree v-if="showDependencies && projectSlug" :project-slug="projectSlug" />
</template>

<script setup lang="ts">
import {
	BoxIcon,
	BracesIcon,
	CheckIcon,
	ClipboardCopyIcon,
	CodeIcon,
	DownloadIcon,
	ExternalIcon,
	LoaderCircleIcon,
} from '@modrinth/assets'
import { computed, onMounted, ref } from 'vue'
import { useBaseFetch } from '../composables/useBaseFetch'
import DependencyTree from './DependencyTree.vue'

const props = defineProps<{
	pageUrl: string
	showTools: boolean
	showDependencies: boolean
}>()

const modfolioUrl = computed(
	() => `https://modfolio.creeperkatze.de/?url=${encodeURIComponent(props.pageUrl)}`,
)

const apiUrl = computed(() => {
	try {
		const path = new URL(props.pageUrl).pathname
		const project = path.match(/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/)
		if (project) return `https://api.modrinth.com/v2/project/${project[2]}`
		const user = path.match(/^\/user\/([^/]+)/)
		if (user) return `https://api.modrinth.com/v2/user/${user[1]}`
		const org = path.match(/^\/organization\/([^/]+)/)
		if (org) return `https://api.modrinth.com/v2/organization/${org[1]}`
		const collection = path.match(/^\/collection\/([^/]+)/)
		if (collection) return `https://api.modrinth.com/v2/collection/${collection[1]}`
		return null
	} catch {
		return null
	}
})

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

const downloadUrl = ref<string | null>(null)
const downloadLoading = ref(false)
const packwizCopied = ref(false)
const downloadCopied = ref(false)

onMounted(async () => {
	if (!projectSlug.value) return
	downloadLoading.value = true
	try {
		const versions = await useBaseFetch(`project/${projectSlug.value}/version?limit=1`)
		const primaryFile = versions?.[0]?.files?.find((f: any) => f.primary) ?? versions?.[0]?.files?.[0]
		downloadUrl.value = primaryFile?.url ?? null
	} catch {
		downloadUrl.value = null
	} finally {
		downloadLoading.value = false
	}
})

async function copyPackwiz() {
	await navigator.clipboard.writeText(`packwiz mr add ${projectSlug.value}`)
	packwizCopied.value = true
	setTimeout(() => {
		packwizCopied.value = false
	}, 1500)
}

async function copyDownloadUrl() {
	if (!downloadUrl.value) return
	await navigator.clipboard.writeText(downloadUrl.value)
	downloadCopied.value = true
	setTimeout(() => {
		downloadCopied.value = false
	}, 1500)
}
</script>
