<template>
	<PopupSection
		v-if="page && (loading || match)"
		:title="formatMessage(messages['popup.found.title'])"
		:icon="ModrinthIcon"
		:bare="!loading && !!match"
	>
		<div v-if="loading" class="flex items-center gap-2 p-3 text-sm text-secondary">
			<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
			{{ formatMessage(messages['popup.found.looking']) }}
		</div>
		<CompactProjectCard
			v-else-if="match"
			:name="match.name"
			:path="projectPath(match.projectType, match.slug)"
			:icon-url="match.iconUrl"
			:author="match.author"
			:summary="match.summary"
			:tags="match.categories"
			:downloads="match.downloads"
		/>
	</PopupSection>
</template>

<script setup lang="ts">
import { ModrinthIcon, SpinnerIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref, shallowRef } from 'vue'

import { queryBackground } from '../../../../core/query'
import {
	type ModrinthMatch,
	type PlatformPage,
	parsePlatformPage,
} from '../../../../features/platforms/pages'
import CompactProjectCard from '../../components/CompactProjectCard.vue'
import PopupSection from '../../components/PopupSection.vue'
import { projectPath } from '../../utils/projects'
import { getActiveTab } from '../../utils/tabs'

const { formatMessage } = useVIntl()

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
