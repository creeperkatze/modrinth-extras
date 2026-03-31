<template>
	<ButtonStyled color="brand">
		<button :disabled="downloadLoading" @click.stop="handleDownload">
			<LoaderCircleIcon v-if="downloadLoading" class="animate-spin" />
			<DownloadIcon v-else />
			{{ formatMessage(messages['projectCardActions.download']) }}
		</button>
	</ButtonStyled>
	<ButtonStyled circular :color="isFollowed ? 'brand' : undefined">
		<button
			v-tooltip="
				isFollowed
					? formatMessage(messages['projectCardActions.unfollow'])
					: formatMessage(messages['projectCardActions.follow'])
			"
			:disabled="followLoading"
			@click.stop="handleFollow"
		>
			<LoaderCircleIcon v-if="followLoading" class="animate-spin" />
			<HeartIcon v-else :fill="isFollowed ? 'currentColor' : 'none'" />
		</button>
	</ButtonStyled>
	<ButtonStyled circular :color="isSaved ? 'brand' : undefined">
		<button
			v-if="!isLoggedIn"
			v-tooltip="formatMessage(messages['projectCardActions.save'])"
			@click.stop="navigate('/auth/sign-in')"
		>
			<BookmarkIcon fill="none" aria-hidden="true" />
		</button>
		<PopoutMenu
			v-else
			:tooltip="
				isSaved
					? formatMessage(messages['projectCardActions.saved'])
					: formatMessage(messages['projectCardActions.save'])
			"
			placement="bottom-end"
			@click.stop="ensureProjectId"
		>
			<BookmarkIcon :fill="isSaved ? 'currentColor' : 'none'" aria-hidden="true" />
			<template #menu>
				<template v-if="collections === null">
					<div class="menu-loading">
						<LoaderCircleIcon class="animate-spin menu-loading-icon" />
					</div>
				</template>
				<template v-else>
					<StyledInput
						v-model="collectionsSearch"
						:placeholder="formatMessage(messages['projectCardActions.searchPlaceholder'])"
						wrapper-class="menu-search"
					/>
					<div v-if="filteredCollections.length > 0" class="collections-list">
						<Checkbox
							v-for="col in filteredCollections"
							:key="col.id"
							:model-value="!!projectId && col.projects.includes(projectId)"
							class="popout-checkbox"
							@update:model-value="handleToggleCollection(col)"
						>
							{{ col.name }}
						</Checkbox>
					</div>
					<div v-else class="menu-text">
						<p class="popout-text">
							{{ formatMessage(messages['projectCardActions.noCollections']) }}
						</p>
					</div>
					<button class="btn collection-button" @click.stop="handleNewCollection">
						<PlusIcon />
						{{ formatMessage(messages['projectCardActions.newCollection']) }}
					</button>
				</template>
			</template>
		</PopoutMenu>
	</ButtonStyled>
	<ButtonStyled circular type="transparent">
		<button
			v-tooltip="
				copied
					? formatMessage(messages['projectCardActions.copied'])
					: formatMessage(messages['projectCardActions.copyLink'])
			"
			@click.stop="handleCopyLink"
		>
			<CheckIcon v-if="copied" />
			<LinkIcon v-else />
		</button>
	</ButtonStyled>
</template>

<script setup lang="ts">
import {
	BookmarkIcon,
	CheckIcon,
	DownloadIcon,
	HeartIcon,
	LinkIcon,
	LoaderCircleIcon,
	PlusIcon,
} from '@modrinth/assets'
import {
	ButtonStyled,
	Checkbox,
	defineMessages,
	PopoutMenu,
	StyledInput,
	useVIntl,
} from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import { apiFetch, getAuthToken } from '../helpers/api'
import {
	type Collection,
	collections,
	getProjectId,
	initCollections,
	toggleProjectInCollection,
} from '../helpers/collectionState'
import { followedSlugs } from '../helpers/followState'
import { navigate } from '../helpers/page-router'
import { getSettings } from '../helpers/settings'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'projectCardActions.download': {
		id: 'projectCardActions.download',
		defaultMessage: 'Download',
	},
	'projectCardActions.follow': { id: 'projectCardActions.follow', defaultMessage: 'Follow' },
	'projectCardActions.unfollow': {
		id: 'projectCardActions.unfollow',
		defaultMessage: 'Unfollow',
	},
	'projectCardActions.save': { id: 'projectCardActions.save', defaultMessage: 'Save' },
	'projectCardActions.saved': { id: 'projectCardActions.saved', defaultMessage: 'Saved' },
	'projectCardActions.searchPlaceholder': {
		id: 'projectCardActions.searchPlaceholder',
		defaultMessage: 'Search...',
	},
	'projectCardActions.noCollections': {
		id: 'projectCardActions.noCollections',
		defaultMessage: 'No collections found.',
	},
	'projectCardActions.newCollection': {
		id: 'projectCardActions.newCollection',
		defaultMessage: 'Create new collection',
	},
	'projectCardActions.copyLink': {
		id: 'projectCardActions.copyLink',
		defaultMessage: 'Copy link',
	},
	'projectCardActions.copied': { id: 'projectCardActions.copied', defaultMessage: 'Copied!' },
})

const props = defineProps<{
	projectSlug: string
	projectType: string
}>()

const isLoggedIn = !!getAuthToken()
const isFollowed = computed(() => followedSlugs.value?.has(props.projectSlug) ?? false)
const isSaved = computed(
	() =>
		!!projectId.value &&
		(collections.value?.some((c) => c.projects.includes(projectId.value!)) ?? false),
)

const projectId = ref<string | null>(null)
const downloadLoading = ref(false)
const followLoading = ref(false)
const copied = ref(false)
const collectionsSearch = ref('')

const filteredCollections = computed(() => {
	if (!collections.value) return []
	const q = collectionsSearch.value.trim().toLowerCase()
	const sorted = collections.value.slice().sort((a, b) => a.name.localeCompare(b.name))
	if (!q) return sorted
	return sorted.filter((c) => c.name.toLowerCase().includes(q))
})

onMounted(() => {
	if (isLoggedIn) initCollections()
})

async function ensureProjectId() {
	if (projectId.value) return
	projectId.value = await getProjectId(props.projectSlug)
}

async function handleDownload() {
	if (downloadLoading.value) return
	downloadLoading.value = true
	try {
		const { projectCardActions } = await getSettings()
		const preferredLoader =
			props.projectType === 'plugin'
				? projectCardActions.pluginLoader
				: projectCardActions.modLoader

		const fetchVersions = async (loader: string) => {
			const qs = loader ? `?loaders=${encodeURIComponent(JSON.stringify([loader]))}` : ''
			return (await apiFetch(`project/${props.projectSlug}/version${qs}`)) as {
				files: { url: string; primary: boolean }[]
			}[]
		}

		let versions = await fetchVersions(preferredLoader)
		if (preferredLoader && versions.length === 0) versions = await fetchVersions('')

		const file = versions[0]?.files.find((f) => f.primary) ?? versions[0]?.files[0]
		if (file?.url) window.open(file.url, '_blank')
	} catch (err) {
		console.error('[Modrinth Extras] Download failed:', err)
	} finally {
		downloadLoading.value = false
	}
}

async function handleFollow() {
	if (!isLoggedIn) return navigate('/auth/sign-in')
	if (followLoading.value) return
	followLoading.value = true
	try {
		if (isFollowed.value) {
			await apiFetch(`project/${props.projectSlug}/follow`, { method: 'DELETE' })
			followedSlugs.value?.delete(props.projectSlug)
		} else {
			await apiFetch(`project/${props.projectSlug}/follow`, { method: 'POST' })
			followedSlugs.value?.add(props.projectSlug)
		}
	} catch (err) {
		console.error('[Modrinth Extras] Follow action failed:', err)
	} finally {
		followLoading.value = false
	}
}

async function handleToggleCollection(col: Collection) {
	if (!projectId.value) return
	try {
		await toggleProjectInCollection(col, projectId.value)
	} catch (err) {
		console.error('[Modrinth Extras] Save action failed:', err)
	}
}

function handleNewCollection() {
	navigate('/dashboard/collections')
}

async function handleCopyLink() {
	const url = `https://modrinth.com/${props.projectType}/${props.projectSlug}`
	try {
		await navigator.clipboard.writeText(url)
		copied.value = true
		setTimeout(() => (copied.value = false), 2000)
	} catch {
		// Clipboard API might not be available
	}
}
</script>

<style scoped>
.menu-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--gap-md);
}

.menu-loading-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--color-secondary);
}

:deep(.menu-search) {
	margin: var(--gap-sm) var(--gap-md);
	width: calc(100% - var(--gap-md) * 2);
}

.collections-list {
	max-height: 20rem;
	overflow-y: auto;
	background-color: var(--color-bg);
	border-radius: var(--radius-md);
	margin: var(--gap-sm) var(--gap-md);
	padding: var(--gap-sm);
}

.popout-checkbox {
	width: 100%;
	padding: var(--gap-sm);
	border-radius: var(--radius-sm);
}

.popout-checkbox:hover {
	background-color: var(--color-button-bg);
}

.menu-text {
	padding: 0 var(--gap-md);
	font-size: var(--font-size-nm);
	color: var(--color-secondary);
}

.popout-text {
	margin: var(--gap-sm) 0;
}

.collection-button {
	margin: var(--gap-sm) var(--gap-md);
	white-space: nowrap;
}
</style>
