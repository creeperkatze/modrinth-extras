<template>
	<div v-if="visible" class="px-3 pb-4">
		<Card class="donation-card relative !mb-0 !p-0">
			<a
				href="https://ko-fi.com/creeperkatze"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-3 px-2 py-2 pr-10 no-underline"
				@click="dismiss"
			>
				<KofiIcon class="!size-6 shrink-0 text-[#FF5E5B]" aria-hidden="true" />
				<div class="min-w-0 flex-1">
					<div class="text-sm font-semibold text-contrast">
						{{ formatMessage(messages['popup.donatePrompt.title']) }}
					</div>
					<div class="text-xs text-secondary">
						{{ formatMessage(messages['popup.donatePrompt.message']) }}
					</div>
				</div>
			</a>
			<ButtonStyled type="transparent" circular size="small">
				<button
					type="button"
					class="absolute right-2 top-2"
					:title="formatMessage(messages['popup.donatePrompt.dismiss'])"
					:aria-label="formatMessage(messages['popup.donatePrompt.dismiss'])"
					@click="dismiss"
				>
					<XIcon aria-hidden="true" />
				</button>
			</ButtonStyled>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { XIcon } from '@modrinth/assets'
import { ButtonStyled, Card, defineMessages, useVIntl } from '@modrinth/ui'
import { storage } from '@wxt-dev/storage'
import { onMounted, ref } from 'vue'

import KofiIcon from '../../../assets/kofi.svg?component'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.donatePrompt.title': {
		id: 'popup.donatePrompt.title',
		defaultMessage: 'Support the extension',
	},
	'popup.donatePrompt.message': {
		id: 'popup.donatePrompt.message',
		defaultMessage:
			'Modrinth Extras will always be free, open source, and ad-free. If you find it useful, consider supporting its development with a small donation.',
	},
	'popup.donatePrompt.dismiss': {
		id: 'popup.donatePrompt.dismiss',
		defaultMessage: 'Dismiss',
	},
})

const DONATE_PROMPT_DELAY_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

interface DonatePromptState {
	installedAt: number
	dismissed: boolean
}

const donatePromptItem = storage.defineItem<DonatePromptState>('local:donatePrompt')

const visible = ref(false)

async function dismiss(): Promise<void> {
	visible.value = false
	const existing = await donatePromptItem.getValue()
	await donatePromptItem.setValue({
		installedAt: existing?.installedAt ?? Date.now(),
		dismissed: true,
	})
}

onMounted(async () => {
	const existing = await donatePromptItem.getValue()
	if (existing?.dismissed) return

	const state = existing ?? { installedAt: Date.now(), dismissed: false }
	if (!existing) await donatePromptItem.setValue(state)

	if (Date.now() - state.installedAt >= DONATE_PROMPT_DELAY_MS) visible.value = true
})
</script>

<style scoped>
.donation-card {
	border-color: rgb(255 94 91 / 30%);
	background-color: rgb(255 94 91 / 10%);
	transition: background-color 150ms ease;
}

.donation-card:hover {
	background-color: rgb(255 94 91 / 18%);
}
</style>
