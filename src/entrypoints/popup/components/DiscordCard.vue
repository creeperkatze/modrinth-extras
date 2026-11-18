<template>
	<div v-if="visible" class="px-3 pb-2">
		<div class="discord-card relative flex gap-3 rounded-2xl border border-solid p-3 pr-10">
			<DiscordIcon class="!size-6 shrink-0 text-[#5865F2]" aria-hidden="true" />
			<div class="min-w-0 flex-1">
				<h3 class="m-0 text-sm font-semibold text-contrast">
					{{ formatMessage(messages['popup.discordPrompt.title']) }}
				</h3>
				<p class="m-0 mt-1 text-xs leading-normal text-secondary">
					{{ formatMessage(messages['popup.discordPrompt.message']) }}
				</p>
				<ButtonLink
					href="https://link.creeperkatze.dev/discord"
					target="_blank"
					rel="noopener"
					type="colored"
					size="sm"
					class="mt-3 w-fit !text-white no-underline"
					style="--button-color: #5865f2"
					@click="dismiss"
				>
					<DiscordIcon aria-hidden="true" />
					{{ formatMessage(messages['popup.discordPrompt.join']) }}
					<ArrowUpRightIcon aria-hidden="true" />
				</ButtonLink>
			</div>
			<div class="absolute right-2 top-2">
				<IconButton
					v-tooltip="formatMessage(messages['popup.discordPrompt.dismiss'])"
					type="quiet"
					size="sm"
					:label="formatMessage(messages['popup.discordPrompt.dismiss'])"
					@click="dismiss"
				>
					<XIcon aria-hidden="true" />
				</IconButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, DiscordIcon, XIcon } from '@modrinth/assets'
import { ButtonLink, defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { storage } from '@wxt-dev/storage'
import { onMounted, ref } from 'vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.discordPrompt.title': {
		id: 'popup.discordPrompt.title',
		defaultMessage: 'Join the Discord',
	},
	'popup.discordPrompt.message': {
		id: 'popup.discordPrompt.message',
		defaultMessage: 'Get help, share feedback, and follow updates on the Discord server.',
	},
	'popup.discordPrompt.join': {
		id: 'popup.discordPrompt.join',
		defaultMessage: 'Join server',
	},
	'popup.discordPrompt.dismiss': {
		id: 'popup.discordPrompt.dismiss',
		defaultMessage: 'Dismiss',
	},
})

interface DiscordPromptState {
	dismissed: boolean
}

const discordPromptItem = storage.defineItem<DiscordPromptState>('local:discordPrompt')

const visible = ref(false)

async function dismiss(): Promise<void> {
	visible.value = false
	await discordPromptItem.setValue({ dismissed: true })
}

onMounted(async () => {
	const existing = await discordPromptItem.getValue()
	if (existing?.dismissed) return
	visible.value = true
})
</script>

<style scoped>
.discord-card {
	border-color: rgb(88 101 242 / 30%);
	background-color: rgb(88 101 242 / 10%);
}
</style>
