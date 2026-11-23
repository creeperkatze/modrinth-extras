<template>
	<a
		class="mb-2 flex w-fit items-center gap-1.5 rounded-[10px] border-0 bg-[#1bd96a] px-2.5 py-[5px] font-[Inter,Arial,sans-serif] text-sm font-semibold text-[#102014] no-underline transition-colors hover:bg-[#43e582] hover:text-[#102014] hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1bd96a]"
		:href="url"
		:target="openInNewTab ? '_blank' : '_self'"
		:rel="openInNewTab ? 'noopener' : undefined"
		@click.stop
	>
		<ModrinthIcon aria-hidden="true" class="size-4 shrink-0" />
		<span>{{ formatMessage(messages['curseforgeSearchResult.open']) }}</span>
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
	'curseforgeSearchResult.open': {
		id: 'curseforgeSearchResult.open',
		defaultMessage: 'Open on Modrinth',
	},
})
</script>
