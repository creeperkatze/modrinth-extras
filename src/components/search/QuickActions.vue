<template>
	<span v-tooltip="downloadTooltip" class="download-action">
		<Button
			type="colored"
			color="brand"
			:disabled="downloadDisabled"
			:loading="downloadLoading || downloadAvailabilityLoading"
			@click.stop="handleDownload"
		>
			<DownloadIcon />
			{{ formatMessage(messages['quickActions.download']) }}
		</Button>
	</span>
	<IconButton
		v-tooltip="
			isFollowed
				? formatMessage(messages['quickActions.unfollow'])
				: formatMessage(messages['quickActions.follow'])
		"
		:color="isFollowed ? 'brand' : undefined"
		:loading="followLoading"
		:label="
			isFollowed
				? formatMessage(messages['quickActions.unfollow'])
				: formatMessage(messages['quickActions.follow'])
		"
		@click.stop="handleFollow"
	>
		<HeartIcon :fill="isFollowed ? 'currentColor' : 'none'" />
	</IconButton>
	<IconButton
		v-if="!isLoggedIn"
		v-tooltip="formatMessage(messages['quickActions.save'])"
		:color="isSaved ? 'brand' : undefined"
		:label="formatMessage(messages['quickActions.save'])"
		@click.stop="navigate('/auth/sign-in')"
	>
		<BookmarkIcon fill="none" aria-hidden="true" />
	</IconButton>
	<span v-else class="save-action" @click.stop>
		<TeleportPopoutMenu
			icon-only
			:tooltip="
				isSaved
					? formatMessage(messages['quickActions.saved'])
					: formatMessage(messages['quickActions.save'])
			"
			:color="isSaved ? 'brand' : undefined"
			:label="
				isSaved
					? formatMessage(messages['quickActions.saved'])
					: formatMessage(messages['quickActions.save'])
			"
			placement="bottom-end"
		>
			<template #trigger>
				<BookmarkIcon :fill="isSaved ? 'currentColor' : 'none'" aria-hidden="true" />
			</template>
			<template #panel>
				<template v-if="collections === null">
					<div class="menu-loading">
						<LoaderCircleIcon class="animate-spin menu-loading-icon" />
					</div>
				</template>
				<template v-else>
					<Input
						v-model="collectionsSearch"
						:placeholder="formatMessage(messages['quickActions.searchPlaceholder'])"
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
							{{ formatMessage(messages['quickActions.noCollections']) }}
						</p>
					</div>
					<div class="collection-button">
						<Button @click.stop="handleNewCollection">
							<PlusIcon />
							{{ formatMessage(messages['quickActions.newCollection']) }}
						</Button>
					</div>
				</template>
			</template>
		</TeleportPopoutMenu>
	</span>
	<IconButton
		v-tooltip="
			copied
				? formatMessage(messages['quickActions.copied'])
				: formatMessage(messages['quickActions.copyLink'])
		"
		type="quiet"
		:label="
			copied
				? formatMessage(messages['quickActions.copied'])
				: formatMessage(messages['quickActions.copyLink'])
		"
		@click.stop="handleCopyLink"
	>
		<CheckIcon v-if="copied" />
		<LinkIcon v-else />
	</IconButton>
</template>

<script setup lang="ts">
import type { Labrinth } from '@modrinth/api-client'
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
	Button,
	Checkbox,
	defineMessages,
	IconButton,
	Input,
	TeleportPopoutMenu,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getAuthToken } from '../../api/client'
import { navigate } from '../../content/page-router'
import type { QuickDownloadSettings } from '../../core/settings'
import { useSettings } from '../../core/settings-store'
import {
	collections,
	initCollections,
	toggleProjectInCollection,
} from '../../features/quick-actions/collection'
import { getRequiredDependencyFiles } from '../../features/quick-actions/dependencies'
import { saveFiles } from '../../features/quick-actions/download'
import { followedSlugs, toggleFollow } from '../../features/quick-actions/follow'
import { getQuickDownload } from '../../features/quick-actions/version'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'quickActions.download': {
		id: 'quickActions.download',
		defaultMessage: 'Download',
	},
	'quickActions.follow': { id: 'quickActions.follow', defaultMessage: 'Follow' },
	'quickActions.unfollow': {
		id: 'quickActions.unfollow',
		defaultMessage: 'Unfollow',
	},
	'quickActions.save': { id: 'quickActions.save', defaultMessage: 'Save' },
	'quickActions.saved': { id: 'quickActions.saved', defaultMessage: 'Saved' },
	'quickActions.searchPlaceholder': {
		id: 'quickActions.searchPlaceholder',
		defaultMessage: 'Search...',
	},
	'quickActions.noCollections': {
		id: 'quickActions.noCollections',
		defaultMessage: 'No collections found.',
	},
	'quickActions.newCollection': {
		id: 'quickActions.newCollection',
		defaultMessage: 'Create new collection',
	},
	'quickActions.copyLink': {
		id: 'quickActions.copyLink',
		defaultMessage: 'Copy link',
	},
	'quickActions.copied': { id: 'quickActions.copied', defaultMessage: 'Copied!' },
	'quickActions.checkingDownload': {
		id: 'quickActions.checkingDownload',
		defaultMessage: 'Checking available version...',
	},
	'quickActions.downloadUnavailable': {
		id: 'quickActions.downloadUnavailable',
		defaultMessage:
			'{loader, select, none {No version available for {version}} other {No version available for {loader} {version}}}',
	},
})

const props = defineProps<{
	projectSlug: string
	projectType: string
}>()

const settings = useSettings()
// A plain copy, since queued version lookups read it later
const downloadSettings = computed<QuickDownloadSettings>(() => {
	const { enabled: _enabled, ...download } = settings.projectCardActions
	return download
})

const isLoggedIn = !!getAuthToken()
const isFollowed = computed(() => followedSlugs.value?.has(props.projectSlug) ?? false)
const isSaved = computed(
	() =>
		!!projectId.value &&
		(collections.value?.some((c) => c.projects.includes(projectId.value!)) ?? false),
)

const projectId = ref<string | null>(null)
const downloadLoading = ref(false)
const downloadAvailabilityLoading = ref(false)
const downloadFile = ref<Labrinth.Versions.v3.VersionFile | null>(null)
const downloadVersionId = ref<string | null>(null)
const downloadAvailabilityChecked = ref(false)
const followLoading = ref(false)
const copied = ref(false)
const collectionsSearch = ref('')

const downloadDisabled = computed(
	() =>
		downloadLoading.value ||
		downloadAvailabilityLoading.value ||
		(downloadAvailabilityChecked.value && !downloadFile.value),
)

const downloadTooltip = computed(() => {
	if (downloadAvailabilityLoading.value) {
		return formatMessage(messages['quickActions.checkingDownload'])
	}
	if (downloadAvailabilityChecked.value && !downloadFile.value) {
		const loader = getSelectedLoader()
		return formatMessage(messages['quickActions.downloadUnavailable'], {
			loader: loader ? loader.charAt(0).toUpperCase() + loader.slice(1) : 'none',
			version: downloadSettings.value.gameVersion,
		})
	}
	return undefined
})

function getSelectedLoader(): string {
	switch (props.projectType) {
		case 'mod':
		case 'modpack':
			return downloadSettings.value.modLoader
		case 'plugin':
			return downloadSettings.value.pluginLoader
		case 'shader':
			return downloadSettings.value.shaderLoader
		default:
			return ''
	}
}

const filteredCollections = computed(() => {
	if (!collections.value) return []
	const q = collectionsSearch.value.trim().toLowerCase()
	const sorted = collections.value.slice().sort((a, b) => a.name.localeCompare(b.name))
	if (!q) return sorted
	return sorted.filter((c) => c.name.toLowerCase().includes(q))
})

onMounted(() => {
	if (isLoggedIn) initCollections()
	void refreshDownloadAvailability()
})

watch(
	() => [
		props.projectSlug,
		props.projectType,
		downloadSettings.value.modLoader,
		downloadSettings.value.pluginLoader,
		downloadSettings.value.shaderLoader,
		downloadSettings.value.gameVersion,
	],
	() => {
		void refreshDownloadAvailability()
	},
)

async function handleDownload() {
	if (downloadDisabled.value) return
	downloadLoading.value = true
	try {
		if (!downloadFile.value) await refreshDownloadAvailability()
		if (!downloadFile.value || !downloadVersionId.value) return

		const dependencyFiles = downloadSettings.value.downloadDependencies
			? await getRequiredDependencyFiles(
					downloadVersionId.value,
					props.projectType,
					downloadSettings.value,
				)
			: []
		if (dependencyFiles.length === 0) {
			window.open(downloadFile.value.url, '_blank')
		} else {
			await saveFiles([downloadFile.value, ...dependencyFiles])
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to download:', err)
	} finally {
		downloadLoading.value = false
	}
}

let availabilityController: AbortController | null = null

async function refreshDownloadAvailability() {
	availabilityController?.abort()
	const controller = new AbortController()
	availabilityController = controller

	downloadAvailabilityLoading.value = true
	downloadAvailabilityChecked.value = false
	downloadFile.value = null
	downloadVersionId.value = null

	try {
		const result = await getQuickDownload(
			props.projectSlug,
			props.projectType,
			downloadSettings.value,
			controller.signal,
		)
		if (controller.signal.aborted) return
		projectId.value = result.projectId
		downloadFile.value = result.file
		downloadVersionId.value = result.versionId
	} catch (err) {
		if (controller.signal.aborted) return
		console.error('[Modrinth Extras] Failed to check download availability:', err)
	} finally {
		if (!controller.signal.aborted) {
			downloadAvailabilityChecked.value = true
			downloadAvailabilityLoading.value = false
		}
	}
}

// Scrolling through search pages unmounts cards, and their lookups shouldn't use up the rate limit.
onBeforeUnmount(() => availabilityController?.abort())

async function handleFollow() {
	if (!isLoggedIn) return navigate('/auth/sign-in')
	if (followLoading.value) return
	followLoading.value = true
	try {
		await toggleFollow(props.projectSlug)
	} catch (err) {
		console.error('[Modrinth Extras] Follow action failed:', err)
	} finally {
		followLoading.value = false
	}
}

async function handleToggleCollection(col: Labrinth.Collections.Collection) {
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

.download-action,
.save-action {
	display: inline-flex;
}
</style>
