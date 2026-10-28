<template>
	<ButtonLink
		v-if="comparison"
		v-tooltip="
			formatMessage(messages['compareVersions.tooltip'], { version: comparison.previousVersion })
		"
		:href="comparison.url"
		target="_blank"
	>
		<ModsrcIcon aria-hidden="true" />
		{{ formatMessage(messages['compareVersions.label']) }}
	</ButtonLink>
</template>

<script setup lang="ts">
import { ButtonLink, defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import ModsrcIcon from '../../assets/icons/modsrc.svg?component'
import { fetchVersionComparison, type VersionComparison } from '../../features/decompilers/links'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'compareVersions.label': {
		id: 'compareVersions.label',
		defaultMessage: 'Compare with previous',
	},
	'compareVersions.tooltip': {
		id: 'compareVersions.tooltip',
		defaultMessage: 'Compare with {version} in modsrc',
	},
})

const props = defineProps<{
	projectSlug: string
	version: string
}>()

const comparison = ref<VersionComparison | null>(null)

onMounted(async () => {
	try {
		comparison.value = await fetchVersionComparison(props.projectSlug, props.version)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version comparison:', err)
	}
})
</script>
