<template>
	<div class="card flex-card experimental-styles-within">
		<h2>{{ formatMessage(messages.title) }}</h2>
		<div class="details-list min-w-0 max-w-full">
			<div v-if="loading" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight"> Loading </span>
			</div>
			<div
				v-else-if="error"
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight"> Failed to load modpacks </span>
			</div>
			<div
				v-else-if="modpacks.length === 0"
				class="details-list__item !w-full min-w-0 max-w-full !items-start text-secondary"
			>
				<XIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight"> No modpacks found </span>
			</div>
			<div v-else class="rounded-2xl bg-surface-2 p-2">
				<ScrollablePanel class="[&__.scrollable-pane]:max-h-96">
					<ul class="m-0 flex list-none flex-col gap-3 p-0 pr-2">
						<li v-for="modpack in modpacks" :key="modpack.project_id">
							<a
								:href="`https://modrinth.com/modpack/${modpack.slug}`"
								target="_blank"
								rel="noopener"
								class="details-list__item !w-full min-w-0 max-w-full !items-center hover:underline"
							>
								<Avatar :src="modpack.icon_url" alt="" size="32px" no-shadow class="mt-0.5" />
								<span class="min-w-0 flex-1 break-words leading-tight">
									{{ modpack.title }}
								</span>
							</a>
						</li>
					</ul>
				</ScrollablePanel>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { XIcon } from '@lucide/vue'
import { LoaderCircleIcon, TriangleAlertIcon } from '@modrinth/assets'
import { Avatar, defineMessages, ScrollablePanel, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import { modrinthClient } from '../../utils/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	title: { id: 'modpacksSidebar.title', defaultMessage: 'Modpacks' },
})

const props = defineProps<{ pageUrl: string }>()

const modpacks = ref<Array<{ project_id: string; slug: string; title: string; icon_url: string }>>(
	[],
)
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const project = await modrinthClient.labrinth.projects_v2.get(slug)
		const result = await modrinthClient.labrinth.projects_v2.search({
			new_filters: `compatible_dependency_project_ids = \`${project.id}\` AND project_types = \`modpack\``,
			limit: 100,
			index: 'downloads',
		})

		modpacks.value = result.hits
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load modpacks:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
