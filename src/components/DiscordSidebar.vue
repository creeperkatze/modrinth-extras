<template>
	<div v-if="invite && discordUrl" class="card flex-card experimental-styles-within relative">
		<img :src="invite.iconUrl" class="size-10 shrink-0 rounded-lg absolute right-4 top-4" />
		<h2 class="mb-1">Discord</h2>
		<div class="details-list min-w-0 max-w-full">
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
			<span
				v-else-if="invite.verified"
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-semibold text-green"
			>
				<ShieldCheckIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['discordSidebar.verified']) }}
				</span>
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	AffiliateIcon,
	ExternalIcon,
	InfoIcon,
	OnlineIndicatorIcon,
	ServerIcon,
	ShieldCheckIcon,
	UsersIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import { apiFetch } from '../helpers/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'discordSidebar.members': {
		id: 'discordSidebar.members',
		defaultMessage: '{count} members',
	},
	'discordSidebar.online': { id: 'discordSidebar.online', defaultMessage: '{count} online' },
	'discordSidebar.partnered': {
		id: 'discordSidebar.partnered',
		defaultMessage: 'Partnered',
	},
	'discordSidebar.verified': { id: 'discordSidebar.verified', defaultMessage: 'Verified' },
})

const props = defineProps<{ pageUrl: string }>()

interface DiscordInvite {
	name: string
	description: string | null
	iconUrl: string | null
	approximate_member_count: number
	approximate_presence_count: number
	partnered: boolean
	verified: boolean
}

const discordUrl = ref<string | null>(null)
const invite = ref<DiscordInvite | null>(null)

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

		const project = (await apiFetch(`project/${slug}`)) as Record<string, unknown>
		const url = (project?.discord_url as string) ?? ''
		if (!url) return

		const code = url.match(/discord\.(?:gg|com\/invite)\/([A-Za-z0-9-]+)/)?.[1]
		if (!code) return

		discordUrl.value = url

		const res = await fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true`)
		if (!res.ok) return

		const data = (await res.json()) as {
			approximate_member_count: number
			approximate_presence_count: number
			guild: {
				id: string
				name: string
				description: string | null
				icon: string | null
				features: string[]
			}
		}
		const { guild } = data
		const features = guild?.features ?? []
		invite.value = {
			name: guild.name,
			description: guild.description ?? null,
			iconUrl: guild.icon
				? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`
				: null,
			approximate_member_count: data.approximate_member_count ?? 0,
			approximate_presence_count: data.approximate_presence_count ?? 0,
			partnered: features.includes('PARTNERED'),
			verified: features.includes('VERIFIED'),
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load Discord data:', err)
	}
})
</script>
