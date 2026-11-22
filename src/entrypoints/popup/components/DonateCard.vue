<template>
	<div v-if="visible">
		<div class="donation-card relative flex gap-3 rounded-2xl border border-solid p-3 pr-10">
			<KofiIcon class="!size-6 shrink-0 text-[#FF5E5B]" aria-hidden="true" />
			<div class="min-w-0 flex-1">
				<h3 class="m-0 text-sm font-semibold text-contrast">
					{{ formatMessage(messages['popup.donatePrompt.title']) }}
				</h3>
				<p class="m-0 mt-1 text-xs leading-normal text-secondary">
					{{ formatMessage(messages['popup.donatePrompt.message']) }}
				</p>
				<ButtonLink
					href="https://ko-fi.com/creeperkatze"
					target="_blank"
					rel="noopener"
					type="colored"
					size="sm"
					class="mt-3 w-fit no-underline"
					style="--button-color: #ff5e5b"
					@click="dismiss"
				>
					<KofiIcon aria-hidden="true" />
					{{ formatMessage(messages['popup.donatePrompt.donate']) }}
					<ArrowUpRightIcon aria-hidden="true" />
				</ButtonLink>
			</div>
			<div class="absolute right-2 top-2">
				<IconButton
					v-tooltip="formatMessage(messages['popup.donatePrompt.dismiss'])"
					type="quiet"
					size="sm"
					:label="formatMessage(messages['popup.donatePrompt.dismiss'])"
					@click="dismiss"
				>
					<XIcon aria-hidden="true" />
				</IconButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, XIcon } from '@modrinth/assets'
import { ButtonLink, defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import KofiIcon from '../../../assets/icons/kofi.svg?component'
import { dismissPrompt, donatePrompt, shouldShowPrompt } from '../../../features/prompts/state'

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
	'popup.donatePrompt.donate': {
		id: 'popup.donatePrompt.donate',
		defaultMessage: 'Donate',
	},
	'popup.donatePrompt.dismiss': {
		id: 'popup.donatePrompt.dismiss',
		defaultMessage: 'Dismiss',
	},
})

const visible = ref(false)

async function dismiss(): Promise<void> {
	visible.value = false
	await dismissPrompt(donatePrompt)
}

onMounted(async () => {
	visible.value = await shouldShowPrompt(donatePrompt)
})
</script>

<style scoped>
.donation-card {
	border-color: rgb(255 94 91 / 30%);
	background-color: rgb(255 94 91 / 10%);
}
</style>
