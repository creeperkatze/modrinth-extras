<template>
	<EmptyState
		:icon="UserIcon"
		:title="formatMessage(messages['popup.signIn.title'])"
		:description="description ?? formatMessage(messages['popup.signIn.description'])"
	>
		<Button size="sm" @click="openModrinth('/auth/sign-in')">
			<LogInIcon aria-hidden="true" />
			{{ formatMessage(messages['popup.signIn.button']) }}
		</Button>
	</EmptyState>
</template>

<script setup lang="ts">
import { LogInIcon, UserIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'

import { openModrinth } from '../utils/tabs'
import EmptyState from './EmptyState.vue'

defineProps<{
	description?: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.signIn.title': {
		id: 'popup.signIn.title',
		defaultMessage: 'Sign in to Modrinth',
	},
	'popup.signIn.description': {
		id: 'popup.signIn.description',
		defaultMessage: 'Sign in on modrinth.com and this tab fills in by itself.',
	},
	'popup.signIn.button': {
		id: 'popup.signIn.button',
		defaultMessage: 'Sign in',
	},
})
</script>
