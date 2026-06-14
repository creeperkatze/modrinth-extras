<template>
	<span v-tooltip="downloadTooltip" class="download-action">
		<ButtonStyled color="brand">
			<button :disabled="downloadDisabled" @click.stop="handleDownload">
				<LoaderCircleIcon
					v-if="downloadLoading || downloadAvailabilityLoading"
					class="animate-spin"
				/>
				<DownloadIcon v-else />
				{{ formatMessage(messages['projectCardActions.download']) }}
			</button>
		</ButtonStyled>
	</span>
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
			@click.stop
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
					<div class="collection-button">
						<ButtonStyled>
							<button @click.stop="handleNewCollection">
								<PlusIcon />
								{{ formatMessage(messages['projectCardActions.newCollection']) }}
							</button>
						</ButtonStyled>
					</div>
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
import { computed, onMounted, ref, watch } from 'vue'

import { getAuthToken, modrinthClient } from '../helpers/api'
import {
	type Collection,
	collections,
	initCollections,
	toggleProjectInCollection,
} from '../helpers/collectionState'
import { followedSlugs } from '../helpers/followState'
import { navigate } from '../helpers/page-router'
import { getQuickDownload, type QuickDownloadSettings } from '../helpers/projectCardState'

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
	'projectCardActions.checkingDownload': {
		id: 'projectCardActions.checkingDownload',
		defaultMessage: 'Checking available version...',
	},
	'projectCardActions.downloadUnavailable': {
		id: 'projectCardActions.downloadUnavailable',
		defaultMessage:
			'{loader, select, none {No version is available for {version}} other {No version is available for {loader} {version}}}',
	},
})

const props = defineProps<{
	projectSlug: string
	projectType: string
	downloadSettings: QuickDownloadSettings
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
const downloadAvailabilityLoading = ref(false)
const downloadFileUrl = ref<string | null>(null)
const downloadAvailabilityChecked = ref(false)
const followLoading = ref(false)
const copied = ref(false)
const collectionsSearch = ref('')

const downloadDisabled = computed(
	() =>
		downloadLoading.value ||
		downloadAvailabilityLoading.value ||
		(downloadAvailabilityChecked.value && !downloadFileUrl.value),
)

const downloadTooltip = computed(() => {
	if (downloadAvailabilityLoading.value) {
		return formatMessage(messages['projectCardActions.checkingDownload'])
	}
	if (downloadAvailabilityChecked.value && !downloadFileUrl.value) {
		const loader = getSelectedLoader()
		return formatMessage(messages['projectCardActions.downloadUnavailable'], {
			loader: loader ? loader.charAt(0).toUpperCase() + loader.slice(1) : 'none',
			version: props.downloadSettings.gameVersion,
		})
	}
	return undefined
})

function getSelectedLoader(): string {
	switch (props.projectType) {
		case 'mod':
		case 'modpack':
			return props.downloadSettings.modLoader
		case 'plugin':
			return props.downloadSettings.pluginLoader
		case 'shader':
			return props.downloadSettings.shaderLoader
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
		props.downloadSettings.modLoader,
		props.downloadSettings.pluginLoader,
		props.downloadSettings.shaderLoader,
		props.downloadSettings.gameVersion,
	],
	() => {
		void refreshDownloadAvailability()
	},
)

async function handleDownload() {
	if (downloadDisabled.value) return
	downloadLoading.value = true
	try {
		if (!downloadFileUrl.value) await refreshDownloadAvailability()
		if (downloadFileUrl.value) window.open(downloadFileUrl.value, '_blank')
	} catch (err) {
		console.error('[Modrinth Extras] Download failed:', err)
	} finally {
		downloadLoading.value = false
	}
}

async function refreshDownloadAvailability() {
	downloadAvailabilityLoading.value = true
	downloadAvailabilityChecked.value = false
	downloadFileUrl.value = null

	try {
		const result = await getQuickDownload(
			props.projectSlug,
			props.projectType,
			props.downloadSettings,
		)
		projectId.value = result.projectId
		downloadFileUrl.value = result.downloadUrl
	} catch (err) {
		console.error('[Modrinth Extras] Failed to check download availability:', err)
	} finally {
		downloadAvailabilityChecked.value = true
		downloadAvailabilityLoading.value = false
	}
}

async function handleFollow() {
	if (!isLoggedIn) return navigate('/auth/sign-in')
	if (followLoading.value) return
	followLoading.value = true
	try {
		if (isFollowed.value) {
			await modrinthClient.request(`/project/${props.projectSlug}/follow`, {
				api: 'labrinth',
				version: 2,
				method: 'DELETE',
			})
			followedSlugs.value?.delete(props.projectSlug)
		} else {
			await modrinthClient.request(`/project/${props.projectSlug}/follow`, {
				api: 'labrinth',
				version: 2,
				method: 'POST',
			})
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

.download-action {
	display: inline-flex;
}
</style>
