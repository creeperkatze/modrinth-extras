<template>
	<div v-if="discordUrl" class="card flex-card experimental-styles-within relative">
		<div v-if="invite?.iconUrl" class="absolute right-4 top-4">
			<Avatar :src="invite.iconUrl" alt="" size="40px" no-shadow />
		</div>
		<h2 class="mb-1">Discord</h2>
		<div class="details-list min-w-0 max-w-full">
			<div v-if="loading" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['discordSidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['discordSidebar.loadError']) }}
					<code
						class="mt-1 block w-fit max-w-full break-words rounded bg-code-bg px-1.5 py-0.5 text-xs text-code-text"
					>
						{{ error }}
					</code>
				</span>
			</div>
			<template v-else-if="invite">
				<a
					:href="discordUrl"
					target="_blank"
					rel="noopener"
					class="details-list__item !w-full min-w-0 max-w-full !items-start hover:underline"
				>
					<ServerIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ invite.name }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
				<span
					v-if="invite.description"
					class="details-list__item !w-full min-w-0 max-w-full !items-start"
				>
					<InfoIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">{{ invite.description }}</span>
				</span>
				<span class="details-list__item !w-full min-w-0 max-w-full !items-start">
					<UsersIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{
							formatMessage(messages['discordSidebar.members'], {
								count: formatNum(invite.approximate_member_count),
							})
						}}
					</span>
				</span>
				<span class="details-list__item !w-full min-w-0 max-w-full !items-start">
					<OnlineIndicatorIcon aria-hidden="true" class="mt-0.5 shrink-0 text-green" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{
							formatMessage(messages['discordSidebar.online'], {
								count: formatNum(invite.approximate_presence_count),
							})
						}}
					</span>
				</span>
				<span
					v-if="invite.partnered"
					class="details-list__item !w-full min-w-0 max-w-full !items-start font-semibold text-blue"
				>
					<AffiliateIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages['discordSidebar.partnered']) }}
					</span>
				</span>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	AffiliateIcon,
	ExternalIcon,
	InfoIcon,
	LoaderCircleIcon,
	OnlineIndicatorIcon,
	ServerIcon,
	TriangleAlertIcon,
	UsersIcon,
} from '@modrinth/assets'
import { Avatar, defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../utils/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'discordSidebar.loading': { id: 'discordSidebar.loading', defaultMessage: 'Loading' },
	'discordSidebar.loadError': {
		id: 'discordSidebar.loadError',
		defaultMessage: 'Failed to load Discord data',
	},
	'discordSidebar.members': {
		id: 'discordSidebar.members',
		defaultMessage: '{count} members',
	},
	'discordSidebar.online': { id: 'discordSidebar.online', defaultMessage: '{count} online' },
	'discordSidebar.partnered': {
		id: 'discordSidebar.partnered',
		defaultMessage: 'Partnered',
	},
})

const props = defineProps<{ pageUrl: string }>()

interface DiscordInvite {
	name: string
	description: string | null
	iconUrl: string | null
	approximate_member_count: number
	approximate_presence_count: number
	partnered: boolean
}

const discordUrl = ref<string | null>(null)
const invite = ref<DiscordInvite | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

function formatNum(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
	if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
	return String(n)
}

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const project = await modrinthClient.labrinth.projects_v3.get(slug)
		const url = project.link_urls.discord?.url ?? ''
		if (!url) return

		const code = url.match(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]+)/)?.[1]
		if (!code) return

		discordUrl.value = url

		const response = await browser.runtime.sendMessage({ type: 'discord-invite', code })
		if (!response?.ok || !response.invite) {
			error.value = response?.error ?? 'Unknown error'
			return
		}
		invite.value = response.invite
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load Discord data:', err)
		error.value = err instanceof Error ? err.message : String(err)
	} finally {
		loading.value = false
	}
})
</script>
