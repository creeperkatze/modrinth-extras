<template>
	<SplitButton
		v-if="comparisons.all.length"
		v-tooltip="
			comparisons.previous
				? formatMessage(messages['compareVersions.tooltip'], {
						version: comparisons.previous.versionNumber,
					})
				: undefined
		"
		:menu-label="formatMessage(messages['compareVersions.compareWith'])"
		:options="options"
		:primary-disabled="!comparisons.previous"
		@click="openPrevious"
	>
		<ModsrcIcon aria-hidden="true" />
		{{ formatMessage(messages['compareVersions.label']) }}
	</SplitButton>
</template>

<script setup lang="ts">
import { type ButtonMenuOption, defineMessages, SplitButton, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import ModsrcIcon from '../../assets/icons/modsrc.svg?component'
import {
	fetchVersionComparisons,
	type VersionComparisons,
} from '../../features/decompilers/compare'

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
	'compareVersions.compareWith': {
		id: 'compareVersions.compareWith',
		defaultMessage: 'Compare with',
	},
})

const props = defineProps<{
	projectSlug: string
	version: string
}>()

const comparisons = ref<VersionComparisons>({ previous: null, all: [] })

const options = computed<ButtonMenuOption[]>(() => [
	{
		type: 'heading',
		id: 'compare-with',
		label: formatMessage(messages['compareVersions.compareWith']),
	},
	...comparisons.value.all.map(
		(comparison): ButtonMenuOption => ({
			type: 'link',
			id: comparison.url,
			label: comparison.versionNumber,
			href: comparison.url,
			target: '_blank',
			selected: comparison.url === comparisons.value.previous?.url,
		}),
	),
])

function openPrevious() {
	if (comparisons.value.previous) window.open(comparisons.value.previous.url, '_blank', 'noopener')
}

onMounted(async () => {
	try {
		comparisons.value = await fetchVersionComparisons(props.projectSlug, props.version)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version comparisons:', err)
	}
})
</script>
