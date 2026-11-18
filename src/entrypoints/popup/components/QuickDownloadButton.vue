<template>
	<IconButton
		v-tooltip="tooltip"
		size="sm"
		type="quiet"
		:label="formatMessage(messages['popup.download.label'])"
		:disabled="state === 'loading'"
		@click="download"
	>
		<SpinnerIcon v-if="state === 'loading'" class="animate-spin" aria-hidden="true" />
		<CheckIcon v-else-if="state === 'done'" class="text-brand" aria-hidden="true" />
		<XIcon v-else-if="state === 'unavailable'" class="text-red" aria-hidden="true" />
		<DownloadIcon v-else aria-hidden="true" />
	</IconButton>
</template>

<script setup lang="ts">
import { CheckIcon, DownloadIcon, SpinnerIcon, XIcon } from '@modrinth/assets'
import { defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import { getRequiredDependencyFiles } from '../../../features/project-cards/dependencies'
import { saveFiles } from '../../../features/project-cards/download'
import { getQuickDownload } from '../../../features/project-cards/version'
import { settings } from '../state/settings'

const props = defineProps<{
	slug: string
	projectType: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.download.label': {
		id: 'popup.download.label',
		defaultMessage: 'Download',
	},
	'popup.download.unavailable': {
		id: 'popup.download.unavailable',
		defaultMessage: 'No version matches your game version and loader',
	},
	'popup.download.failed': {
		id: 'popup.download.failed',
		defaultMessage: 'Download failed',
	},
})

const state = ref<'idle' | 'loading' | 'done' | 'unavailable' | 'failed'>('idle')

const tooltip = computed(() => {
	if (state.value === 'unavailable') return formatMessage(messages['popup.download.unavailable'])
	if (state.value === 'failed') return formatMessage(messages['popup.download.failed'])
	return formatMessage(messages['popup.download.label'])
})

// Only looked up on click, so lists of projects don't use up the rate limit
async function download() {
	state.value = 'loading'
	try {
		const downloadSettings = settings.projectCardActions
		const result = await getQuickDownload(props.slug, props.projectType, downloadSettings)
		if (!result.file || !result.versionId) {
			state.value = 'unavailable'
			return
		}
		const dependencies = downloadSettings.downloadDependencies
			? await getRequiredDependencyFiles(result.versionId, props.projectType, downloadSettings)
			: []
		// Saved as files so the popup stays open instead of navigating to the download
		await saveFiles([result.file, ...dependencies])
		state.value = 'done'
	} catch (err) {
		state.value = 'failed'
		console.error('[Modrinth Extras] Failed to download:', err)
	}
}
</script>
