<template>
	<!-- Built like the website's ProjectCard, so hover, focus and press behave the same -->
	<!-- SmartClickable's grid column grows with its content unless capped to the card width -->
	<div class="[&>.smart-clickable]:grid-cols-[minmax(0,1fr)]">
		<SmartClickable>
			<template #clickable>
				<a
					:href="modrinthUrl(path)"
					:aria-label="name"
					class="no-click-animation custom-focus-indicator rounded-2xl outline-none"
					@click.prevent="openModrinth(path)"
				/>
			</template>
			<div
				class="flex h-full w-full items-start gap-3 rounded-2xl border border-solid bg-surface-3 p-3 transition-all smart-clickable:outline-on-focus smart-clickable:highlight-on-hover"
				:class="selected ? 'border-brand' : 'border-surface-4'"
			>
				<Avatar :src="iconUrl" :alt="name" size="3rem" no-shadow class="ease-brightness shrink-0" />
				<div class="flex min-w-0 flex-1 flex-col gap-1.5">
					<div class="flex min-w-0 flex-col gap-0.5">
						<div class="flex min-w-0 items-baseline gap-1.5">
							<span
								class="truncate text-sm font-semibold text-contrast smart-clickable:underline-on-hover"
							>
								{{ name }}
							</span>
							<span v-if="author" class="shrink-0 truncate text-xs text-secondary">
								{{ formatMessage(messages.by, { author }) }}
							</span>
						</div>
						<span v-if="summary" class="line-clamp-2 text-xs text-secondary">{{ summary }}</span>
					</div>
					<div v-if="pills.length > 0" class="flex flex-wrap items-center gap-1.5">
						<TagItem
							v-for="pill in pills"
							:key="pill.id"
							class="smart-clickable:allow-pointer-events"
						>
							<component
								:is="icon.icon"
								v-for="icon in pill.icons"
								:key="icon.id"
								v-tooltip="icon.label"
								:aria-label="icon.label"
								:style="icon.color ? { color: icon.color } : undefined"
							/>
						</TagItem>
					</div>
				</div>
				<div class="flex shrink-0 flex-col items-end gap-2 text-sm empty:hidden">
					<template v-if="serverOnlinePlayers !== undefined">
						<ServerOnlinePlayers
							:online="serverOnlinePlayers"
							:status-online="serverStatusOnline"
							hide-label
						/>
						<ServerRecentPlays
							v-if="serverRecentPlays !== undefined"
							:recent-plays="serverRecentPlays"
							hide-label
						/>
					</template>
					<template v-else>
						<div
							v-if="downloads !== undefined"
							v-tooltip="formatStat(commonMessages.projectDownloads, downloads)"
							class="flex items-center gap-2 smart-clickable:allow-pointer-events"
						>
							<DownloadIcon class="size-5 shrink-0" aria-hidden="true" />
							<span class="font-medium">{{ formatCompactNumber(downloads) }}</span>
						</div>
						<div
							v-if="followers !== undefined"
							v-tooltip="formatStat(commonMessages.projectFollowers, followers)"
							class="flex items-center gap-2 smart-clickable:allow-pointer-events"
						>
							<HeartIcon class="size-5 shrink-0" aria-hidden="true" />
							<span class="font-medium">{{ formatCompactNumber(followers) }}</span>
						</div>
					</template>
				</div>
			</div>
		</SmartClickable>
	</div>
</template>

<script setup lang="ts">
import type { Labrinth } from '@modrinth/api-client'
import {
	ClientIcon,
	DownloadIcon,
	getTagIcon,
	GlobeIcon,
	HeartIcon,
	ServerIcon,
	UserIcon,
} from '@modrinth/assets'
import {
	Avatar,
	commonMessages,
	defineMessages,
	formatTag,
	getTagMessage,
	type MessageDescriptor,
	ServerOnlinePlayers,
	ServerRecentPlays,
	SmartClickable,
	sortTagsForDisplay,
	TagItem,
	useCompactNumber,
	useVIntl,
} from '@modrinth/ui'
import { capitalizeString } from '@modrinth/utils'
import { type Component, computed } from 'vue'

import { modrinthUrl, openModrinth } from '../utils/tabs'

const props = defineProps<{
	name: string
	path: string
	iconUrl?: string | null
	author?: string
	summary?: string
	// Categories and loaders mixed, like a project's tags on the website
	tags?: string[]
	environment?: Labrinth.Projects.v3.Environment
	downloads?: number
	followers?: number
	// Servers show these instead of downloads and follows
	serverOnlinePlayers?: number
	serverStatusOnline?: boolean
	serverRecentPlays?: number
	selected?: boolean
}>()

const { formatMessage } = useVIntl()
const { formatCompactNumber } = useCompactNumber()

const messages = defineMessages({
	by: {
		id: 'popup.project.by',
		defaultMessage: 'by {author}',
	},
	clientOrServer: {
		id: 'popup.project.environment.clientOrServer',
		defaultMessage: 'Client or server',
	},
	clientAndServer: {
		id: 'popup.project.environment.clientAndServer',
		defaultMessage: 'Client and server',
	},
	client: {
		id: 'popup.project.environment.client',
		defaultMessage: 'Client',
	},
	server: {
		id: 'popup.project.environment.server',
		defaultMessage: 'Server',
	},
	singleplayer: {
		id: 'popup.project.environment.singleplayer',
		defaultMessage: 'Singleplayer',
	},
	dedicatedServer: {
		id: 'popup.project.environment.dedicatedServer',
		defaultMessage: 'Dedicated server',
	},
})

interface PillIcon {
	id: string
	icon: Component
	label: string
	color?: string
}

// Same icons as the environment tag on the website's project cards
const ENVIRONMENTS: Partial<
	Record<Labrinth.Projects.v3.Environment, { icon: Component; label: keyof typeof messages }>
> = {
	client_or_server: { icon: GlobeIcon, label: 'clientOrServer' },
	client_or_server_prefers_both: { icon: GlobeIcon, label: 'clientOrServer' },
	client_and_server: { icon: GlobeIcon, label: 'clientAndServer' },
	client_only: { icon: ClientIcon, label: 'client' },
	client_only_server_optional: { icon: ClientIcon, label: 'client' },
	server_only: { icon: ServerIcon, label: 'server' },
	server_only_client_optional: { icon: ServerIcon, label: 'server' },
	singleplayer_only: { icon: UserIcon, label: 'singleplayer' },
	dedicated_server_only: { icon: ServerIcon, label: 'dedicatedServer' },
}

// Same tooltip as the stats on the website's project cards
function formatStat(message: MessageDescriptor, count: number) {
	return capitalizeString(formatMessage(message, { count }))
}

function isLoader(tag: string) {
	return getTagMessage(tag, 'loader') !== undefined
}

function tagIcons(tags: string[], colored: boolean): PillIcon[] {
	return tags.flatMap((tag) => {
		const icon = getTagIcon(tag)
		if (!icon) return []
		const color = colored ? `var(--color-platform-${tag})` : undefined
		return [{ id: tag, icon, label: formatTag(formatMessage, tag), color }]
	})
}

function environmentIcons(environment?: Labrinth.Projects.v3.Environment): PillIcon[] {
	const match = environment ? ENVIRONMENTS[environment] : undefined
	if (!environment || !match) return []
	return [{ id: environment, icon: match.icon, label: formatMessage(messages[match.label]) }]
}

// Environment, categories and loaders each get one pill of icons
const pills = computed(() => {
	const tags = sortTagsForDisplay([...new Set(props.tags ?? [])])
	return [
		{ id: 'environment', icons: environmentIcons(props.environment) },
		{
			id: 'categories',
			icons: tagIcons(
				tags.filter((tag) => !isLoader(tag)),
				false,
			),
		},
		{ id: 'loaders', icons: tagIcons(tags.filter(isLoader), true) },
	].filter((pill) => pill.icons.length > 0)
})
</script>
