<template>
	<ButtonLink
		v-if="previous"
		v-tooltip="tooltip"
		type="quiet"
		:href="previous.url"
		target="_blank"
		:aria-label="tooltip"
		class="!w-9 !rounded-full !px-0 hover:!bg-button-bg"
	>
		<ModsrcIcon aria-hidden="true" />
	</ButtonLink>
</template>

<script setup lang="ts">
import { ButtonLink, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import ModsrcIcon from '../../assets/icons/modsrc.svg?component'
import { fetchVersionComparisons, type VersionComparison } from '../../features/decompilers/compare'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'compareVersions.tooltip': {
		id: 'compareVersions.tooltip',
		defaultMessage: 'Compare with {version} in modsrc',
	},
})

const props = defineProps<{
	projectSlug: string
	version: string
}>()

const previous = ref<VersionComparison | null>(null)

const tooltip = computed(() =>
	previous.value
		? formatMessage(messages['compareVersions.tooltip'], { version: previous.value.versionNumber })
		: undefined,
)

onMounted(async () => {
	try {
		previous.value = (await fetchVersionComparisons(props.projectSlug, props.version)).previous
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version comparisons:', err)
	}
})
</script>
