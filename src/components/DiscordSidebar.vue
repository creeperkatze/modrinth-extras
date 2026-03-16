<template>
	<div v-if="invite && discordUrl" class="card flex-card experimental-styles-within relative">
		<img :src="invite.iconUrl" alt="" class="size-10 shrink-0 rounded-lg" />
		<h2 class="mb-1">Discord</h2>
		<div class="details-list">
			<a
				:href="discordUrl"
				target="_blank"
				rel="noopener"
				class="details-list__item hover:underline"
			>
				<ServerIcon aria-hidden="true" />
				{{ invite.name }}
				<ExternalIcon aria-hidden="true" class="external-icon" />
			</a>
			<span v-if="invite.description" class="details-list__item" style="align-items: flex-start">
				<InfoIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				{{ invite.description }}
			</span>
			<span class="details-list__item">
				<UsersIcon aria-hidden="true" />
				{{ formatNum(invite.approximate_member_count) }} members
			</span>
			<span class="details-list__item">
				<OnlineIndicatorIcon aria-hidden="true" class="text-green" />
				{{ formatNum(invite.approximate_presence_count) }} online
			</span>
			<span v-if="invite.partnered" class="details-list__item font-semibold text-blue">
				<AffiliateIcon aria-hidden="true" />
				Partnered
			</span>
			<span v-else-if="invite.verified" class="details-list__item font-semibold text-green">
				<ShieldCheckIcon aria-hidden="true" />
				Verified
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
import { onMounted, ref } from 'vue'

import { useBaseFetch } from '../composables/useBaseFetch'

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

		const project = (await useBaseFetch(`project/${slug}`)) as Record<string, unknown>
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
	} catch {
		// silently ignore, card simply won't render
	}
})
</script>
