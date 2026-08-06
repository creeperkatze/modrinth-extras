<template>
	<div class="card flex-card experimental-styles-within">
		<button
			class="flex w-full items-center justify-between gap-2 text-left text-lg font-semibold m-0 text-primary"
			:disabled="loading || error || modpacks.length === 0"
			@click="expanded = !expanded"
		>
			<h2 class="m-0">{{ formatMessage(messages.title) }}</h2>
			<ChevronRightIcon
				v-if="totalHits > 4"
				aria-hidden="true"
				class="shrink-0 transition-transform"
				:class="{ 'rotate-90': expanded }"
			/>
		</button>
		<div v-if="loading" class="details-list min-w-0 max-w-full">
			<div class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight"> Loading </span>
			</div>
		</div>
		<div v-else-if="error" class="details-list min-w-0 max-w-full">
			<div
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-normal text-secondary"
			>
				<span class="min-w-0 flex-1 break-words leading-tight"> Failed to load modpacks </span>
			</div>
		</div>
		<div v-else-if="modpacks.length === 0" class="details-list min-w-0 max-w-full">
			<div class="details-list__item !w-full min-w-0 max-w-full !items-start text-secondary">
				<XIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight"> No modpacks found </span>
			</div>
		</div>
		<div v-else class="details-list min-w-0 max-w-full">
			<ScrollablePanel v-if="expanded" class="[&__.scrollable-pane]:max-h-96">
				<ul class="m-0 flex list-none flex-col gap-3 p-0 pr-2">
					<li v-for="modpack in modpacks" :key="modpack.project_id">
						<a
							:href="`https://modrinth.com/modpack/${modpack.slug}`"
							target="_blank"
							rel="noopener"
							class="details-list__item !w-full min-w-0 max-w-full !items-center hover:underline"
						>
							<img
								:src="modpack.icon_url"
								:alt="modpack.title"
								class="mt-0.5 h-8 w-8 shrink-0 rounded"
							/>
							<span class="min-w-0 flex-1 break-words leading-tight">
								{{ modpack.title }}
							</span>
						</a>
					</li>
				</ul>
			</ScrollablePanel>
			<div v-else class="relative flex list-none flex-col gap-3 p-0 pr-2">
				<a
					v-for="modpack in visibleModpacks"
					:key="modpack.project_id"
					:href="`https://modrinth.com/modpack/${modpack.slug}`"
					target="_blank"
					rel="noopener"
					class="details-list__item !w-full min-w-0 max-w-full !items-center hover:underline"
				>
					<img
						:src="modpack.icon_url"
						:alt="modpack.title"
						class="mt-0.5 h-8 w-8 shrink-0 rounded"
					/>
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ modpack.title }}
					</span>
				</a>
				<div
					v-if="totalHits > 4"
					class="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center pb-1"
				>
					<div
						class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-3 to-transparent"
					/>
					<button
						type="button"
						class="relative text-sm font-medium text-secondary hover:underline"
						@click="expanded = true"
					>
						{{ formatMessage(messages.moreModpacks) }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ChevronRightIcon, XIcon } from '@lucide/vue'
import { LoaderCircleIcon } from '@modrinth/assets'
import { defineMessages, ScrollablePanel, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import { modrinthClient } from '../../utils/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	title: { id: 'modpacksSidebar.title', defaultMessage: 'Modpacks' },
	moreModpacks: {
		id: 'modpacksSidebar.more',
		defaultMessage: 'Show more modpacks',
	},
})

const props = defineProps<{ pageUrl: string }>()

const modpacks = ref<Array<{ project_id: string; slug: string; title: string; icon_url: string }>>(
	[],
)
const totalHits = ref(0)
const loading = ref(true)
const error = ref(false)
const expanded = ref(false)

const visibleModpacks = computed(() => modpacks.value.slice(0, 4))

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
		totalHits.value = result.total_hits
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load modpacks:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
