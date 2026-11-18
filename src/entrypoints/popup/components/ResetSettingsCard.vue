<template>
	<div
		class="flex items-center justify-between gap-4 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3"
	>
		<div class="min-w-0">
			<h3 class="m-0 flex items-center gap-2 text-sm font-semibold text-contrast">
				<RotateCounterClockwiseIcon aria-hidden="true" class="size-4 shrink-0 text-primary" />
				{{ formatMessage(messages['popup.resetSettings.title']) }}
			</h3>
			<p class="m-0 mt-1 text-xs leading-normal text-secondary">
				{{ formatMessage(messages['popup.resetSettings.description']) }}
			</p>
		</div>
		<Button type="colored" color="red" size="sm" class="shrink-0" @click="modal?.show()">
			{{ formatMessage(messages['popup.resetSettings.button']) }}
		</Button>
	</div>

	<NewModal
		ref="modal"
		danger
		max-width="360px"
		:header="formatMessage(messages['popup.resetSettings.confirmTitle'])"
	>
		<div class="flex flex-col gap-4">
			<p class="m-0">{{ formatMessage(messages['popup.resetSettings.confirmMessage']) }}</p>
			<div class="flex justify-end gap-2">
				<Button @click="modal?.hide()">
					<XIcon aria-hidden="true" />
					{{ formatMessage(messages['popup.resetSettings.cancel']) }}
				</Button>
				<Button type="colored" color="red" @click="confirm">
					<RotateCounterClockwiseIcon aria-hidden="true" />
					{{ formatMessage(messages['popup.resetSettings.button']) }}
				</Button>
			</div>
		</div>
	</NewModal>
</template>

<script setup lang="ts">
import { RotateCounterClockwiseIcon, XIcon } from '@modrinth/assets'
import { Button, defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { useTemplateRef } from 'vue'

const emit = defineEmits<{
	reset: []
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.resetSettings.title': {
		id: 'popup.resetSettings.title',
		defaultMessage: 'Reset settings',
	},
	'popup.resetSettings.description': {
		id: 'popup.resetSettings.description',
		defaultMessage: 'Turn every setting back to its default.',
	},
	'popup.resetSettings.button': {
		id: 'popup.resetSettings.button',
		defaultMessage: 'Reset',
	},
	'popup.resetSettings.confirmTitle': {
		id: 'popup.resetSettings.confirmTitle',
		defaultMessage: 'Reset settings?',
	},
	'popup.resetSettings.confirmMessage': {
		id: 'popup.resetSettings.confirmMessage',
		defaultMessage:
			'All settings go back to their defaults, including the language and sidebar layout. This cannot be undone.',
	},
	'popup.resetSettings.cancel': {
		id: 'popup.resetSettings.cancel',
		defaultMessage: 'Cancel',
	},
})

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')

function confirm() {
	modal.value?.hide()
	emit('reset')
}
</script>
