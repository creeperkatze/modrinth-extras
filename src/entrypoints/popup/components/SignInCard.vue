<template>
	<EmptyState
		type="no-connection"
		:heading="formatMessage(messages['popup.signIn.title'])"
		:description="description"
	>
		<template #actions>
			<Button type="colored" color="brand" @click="openModrinth('/auth/sign-in')">
				<LogInIcon aria-hidden="true" />
				{{ formatMessage(messages['popup.signIn.button']) }}
			</Button>
		</template>
	</EmptyState>
</template>

<script setup lang="ts">
import { LogInIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'

import { openModrinth } from '../utils/tabs'
import EmptyState from './EmptyState.vue'

defineProps<{
	description: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.signIn.title': {
		id: 'popup.signIn.title',
		defaultMessage: 'Sign in to Modrinth',
	},
	'popup.signIn.button': {
		id: 'popup.signIn.button',
		defaultMessage: 'Sign in',
	},
})
</script>
