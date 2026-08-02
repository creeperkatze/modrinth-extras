<template>
	<div v-if="visible" class="px-3 pt-4">
		<Card class="discord-card relative !p-0">
			<a
				href="https://link.creeperkatze.dev/discord"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-3 px-2 py-2 pr-10 no-underline"
				@click="dismiss"
			>
				<DiscordIcon class="!size-6 shrink-0 text-[#5865F2]" aria-hidden="true" />
				<div class="min-w-0 flex-1">
					<div class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages['popup.discordPrompt.title']) }}
					</div>
					<div class="text-xs text-secondary">
						{{ formatMessage(messages['popup.discordPrompt.message']) }}
					</div>
				</div>
			</a>
			<ButtonStyled type="transparent" circular size="small">
				<button
					type="button"
					class="absolute right-2 top-2"
					:title="formatMessage(messages['popup.discordPrompt.dismiss'])"
					:aria-label="formatMessage(messages['popup.discordPrompt.dismiss'])"
					@click="dismiss"
				>
					<XIcon aria-hidden="true" />
				</button>
			</ButtonStyled>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { DiscordIcon, XIcon } from '@modrinth/assets'
import { ButtonStyled, Card, defineMessages, useVIntl } from '@modrinth/ui'
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
	transition: background-color 150ms ease;
}

.discord-card:hover {
	background-color: rgb(88 101 242 / 18%);
}
</style>
