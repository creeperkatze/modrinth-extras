<template>
	<a
		class="btn-cta flex flex-1 items-center justify-center gap-2 whitespace-nowrap !bg-[#1bd96a] px-4 py-2 !text-[#102014] no-underline hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1bd96a]"
		:href="url"
		:target="openInNewTab ? '_blank' : '_self'"
		:rel="openInNewTab ? 'noopener' : undefined"
		@click.stop
	>
		<ModrinthIcon aria-hidden="true" class="size-5 shrink-0" />
		<span>{{ formatMessage(messages['curseforgeIntegrationButton.open']) }}</span>
	</a>
</template>

<script setup lang="ts">
import ModrinthIcon from '@modrinth/assets/branding/logo.svg?component'
import { defineMessages, useVIntl } from '@modrinth/ui/src/composables/i18n.ts'
import { computed } from 'vue'

import { useSettings } from '../../core/settings-store'

defineProps<{
	url: string
}>()

const { formatMessage } = useVIntl()
const settings = useSettings()
const openInNewTab = computed(() => settings.curseforgeIntegration.openIn === 'new')

const messages = defineMessages({
	'curseforgeIntegrationButton.open': {
		id: 'curseforgeIntegrationButton.open',
		defaultMessage: 'Open on Modrinth',
	},
})
</script>
