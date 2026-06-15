<template>
	<Admonition type="info">
		<IntlFormatted :message-id="messages['errorNotice.message']">
			<template #link="{ children }">
				<a
					href="https://github.com/creeperkatze/modrinth-extras/issues"
					target="_blank"
					class="text-link"
					><component :is="() => children"
				/></a>
			</template>
		</IntlFormatted>
	</Admonition>
</template>

<script setup lang="ts">
import { Admonition, defineMessages, IntlFormatted } from '@modrinth/ui'

const messages = defineMessages({
	'errorNotice.message': {
		id: 'errorNotice.message',
		defaultMessage:
			'This error might be related to Modrinth Extras. Try disabling the extension and refreshing the page before reporting this to Modrinth. If the error goes away, please report it <link>here</link>.',
	},
})
</script>
