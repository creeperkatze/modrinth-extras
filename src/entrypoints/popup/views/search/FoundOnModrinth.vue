<template>
	<PopupSection
		v-if="page && (loading || match)"
		:title="formatMessage(messages['popup.found.title'])"
		:icon="ModrinthIcon"
	>
		<div v-if="loading" class="flex items-center gap-2 p-3 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
			{{ formatMessage(messages['popup.found.looking']) }}
		</div>
		<ProjectRow
			v-else-if="match"
			:name="match.name"
			:icon-url="match.iconUrl"
			:href="modrinthUrl(projectPath(match.projectType, match.slug))"
			@open="openModrinth(projectPath(match.projectType, match.slug))"
		>
			<template #meta>
				<DownloadIcon class="size-3 shrink-0" aria-hidden="true" />
				{{ formatCompactNumber(match.downloads) }}
			</template>
			<template #actions>
				<QuickDownloadButton :slug="match.slug" :project-type="match.projectType" />
			</template>
		</ProjectRow>
	</PopupSection>
</template>

<script setup lang="ts">
import { DownloadIcon, ModrinthIcon, SpinnerIcon } from '@modrinth/assets'
import { defineMessages, useCompactNumber, useVIntl } from '@modrinth/ui'
import { onMounted, ref, shallowRef } from 'vue'

import { queryBackground } from '../../../../core/query'
import {
	type ModrinthMatch,
	type PlatformPage,
	parsePlatformPage,
} from '../../../../features/platforms/pages'
import PopupSection from '../../components/PopupSection.vue'
import ProjectRow from '../../components/ProjectRow.vue'
import QuickDownloadButton from '../../components/QuickDownloadButton.vue'
import { projectPath } from '../../utils/projects'
import { getActiveTab, modrinthUrl, openModrinth } from '../../utils/tabs'

const { formatMessage } = useVIntl()
const { formatCompactNumber } = useCompactNumber()

const messages = defineMessages({
	'popup.found.title': {
		id: 'popup.found.title',
		defaultMessage: 'Also on Modrinth',
	},
	'popup.found.looking': {
		id: 'popup.found.looking',
		defaultMessage: 'Looking for this project on Modrinth...',
	},
})

const page = shallowRef<PlatformPage | null>(null)
const match = shallowRef<ModrinthMatch | null>(null)
const loading = ref(false)

onMounted(async () => {
	const tab = await getActiveTab()
	page.value = tab?.url ? parsePlatformPage(tab.url) : null
	if (!page.value) return

	loading.value = true
	try {
		const response = await queryBackground<{ match: ModrinthMatch | null }>({
			type: 'modrinth-match',
			page: page.value,
		})
		match.value = response.match
	} catch (err) {
		console.error('[Modrinth Extras] Failed to find the current page on Modrinth:', err)
	} finally {
		loading.value = false
	}
})
</script>
