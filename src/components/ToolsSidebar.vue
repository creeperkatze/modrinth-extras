<template>
	<div class="card flex-card experimental-styles-within">
		<h2>{{ formatMessage(messages['toolsSidebar.title']) }}</h2>
		<div class="details-list min-w-0 max-w-full">
			<div class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<CodeIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<a
					:href="modfolioUrl"
					target="_blank"
					rel="noopener"
					class="min-w-0 flex-1 break-words leading-tight hover:underline"
				>
					{{ formatMessage(messages['toolsSidebar.generateEmbed']) }}
					<ExternalIcon
						aria-hidden="true"
						class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
					/>
				</a>
			</div>
			<div v-if="apiUrl" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<BracesIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<a
					:href="apiUrl"
					target="_blank"
					rel="noopener"
					class="min-w-0 flex-1 break-words leading-tight hover:underline"
				>
					{{ formatMessage(messages['toolsSidebar.viewApiResponse']) }}
					<ExternalIcon
						aria-hidden="true"
						class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
					/>
				</a>
			</div>
			<template v-if="projectSlug">
				<div
					v-if="downloadLoading || downloadUrl"
					class="details-list__item !w-full min-w-0 max-w-full !items-start"
				>
					<DownloadIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<LoaderCircleIcon
						v-if="downloadLoading"
						class="mt-0.5 shrink-0 animate-spin text-secondary"
					/>
					<button
						v-else-if="downloadUrl"
						class="min-w-0 flex-1 cursor-pointer whitespace-normal break-words border-0 bg-transparent p-0 text-left leading-tight text-primary hover:underline [font:inherit]"
						:aria-label="
							downloadCopied
								? formatMessage(messages['toolsSidebar.copied'])
								: formatMessage(messages['toolsSidebar.copyDownloadUrl'])
						"
						@click="copyDownloadUrl"
					>
						{{
							downloadCopied
								? formatMessage(messages['toolsSidebar.copied'])
								: formatMessage(messages['toolsSidebar.copyDownloadUrl'])
						}}
						<CheckIcon
							v-if="downloadCopied"
							aria-hidden="true"
							class="ml-1 inline size-4 align-[-0.125em] text-brand"
						/>
						<CopyIcon
							v-else
							aria-hidden="true"
							class="ml-1 inline size-4 align-[-0.125em] text-secondary"
						/>
					</button>
				</div>
				<div class="details-list__item !w-full min-w-0 max-w-full !items-start">
					<BoxIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<button
						class="min-w-0 flex-1 cursor-pointer whitespace-normal break-words border-0 bg-transparent p-0 text-left leading-tight text-primary hover:underline [font:inherit]"
						:aria-label="
							packwizCopied
								? formatMessage(messages['toolsSidebar.copied'])
								: formatMessage(messages['toolsSidebar.copyPackwiz'])
						"
						@click="copyPackwiz"
					>
						{{
							packwizCopied
								? formatMessage(messages['toolsSidebar.copied'])
								: formatMessage(messages['toolsSidebar.copyPackwiz'])
						}}
						<CheckIcon
							v-if="packwizCopied"
							aria-hidden="true"
							class="ml-1 inline size-4 align-[-0.125em] text-brand"
						/>
						<CopyIcon
							v-else
							aria-hidden="true"
							class="ml-1 inline size-4 align-[-0.125em] text-secondary"
						/>
					</button>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	BoxIcon,
	BracesIcon,
	CheckIcon,
	CodeIcon,
	CopyIcon,
	DownloadIcon,
	ExternalIcon,
	LoaderCircleIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import { apiFetch } from '../helpers/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'toolsSidebar.title': { id: 'toolsSidebar.title', defaultMessage: 'Tools' },
	'toolsSidebar.generateEmbed': {
		id: 'toolsSidebar.generateEmbed',
		defaultMessage: 'Generate embed',
	},
	'toolsSidebar.viewApiResponse': {
		id: 'toolsSidebar.viewApiResponse',
		defaultMessage: 'View API response',
	},
	'toolsSidebar.copyDownloadUrl': {
		id: 'toolsSidebar.copyDownloadUrl',
		defaultMessage: 'Copy download URL',
	},
	'toolsSidebar.copyPackwiz': {
		id: 'toolsSidebar.copyPackwiz',
		defaultMessage: 'Copy packwiz',
	},
	'toolsSidebar.copied': { id: 'toolsSidebar.copied', defaultMessage: 'Copied!' },
})

const props = defineProps<{
	pageUrl: string
}>()

const modfolioUrl = computed(
	() => `https://modfolio.creeperkatze.dev/?url=${encodeURIComponent(props.pageUrl)}`,
)

const apiUrl = computed(() => {
	try {
		const path = new URL(props.pageUrl).pathname
		const project = path.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
		)
		if (project) return `https://api.modrinth.com/v2/project/${project[2]}`
		const user = path.match(/^\/user\/([^/]+)/)
		if (user) return `https://api.modrinth.com/v2/user/${user[1]}`
		const org = path.match(/^\/organization\/([^/]+)/)
		if (org) return `https://api.modrinth.com/v3/organization/${org[1]}`
		const collection = path.match(/^\/collection\/([^/]+)/)
		if (collection) return `https://api.modrinth.com/v3/collection/${collection[1]}`
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
		const versions = (await apiFetch(`project/${projectSlug.value}/version?limit=1`)) as {
			files?: { primary?: boolean; url?: string }[]
		}[]
		const primaryFile = versions?.[0]?.files?.find((f) => f.primary) ?? versions?.[0]?.files?.[0]
		downloadUrl.value = primaryFile?.url ?? null
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch download URL:', err)
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
