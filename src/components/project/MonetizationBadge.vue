<template>
	<div
		v-if="status === 'force-demonetized'"
		v-tooltip="formatMessage(messages.forceDemonetizedTitle)"
		class="details-list__item text-orange"
	>
		<CurrencyIcon aria-hidden="true" />
		<div>{{ formatMessage(messages.forceDemonetized) }}</div>
	</div>
	<div v-else-if="status === 'demonetized'" class="details-list__item">
		<CurrencyIcon aria-hidden="true" />
		<div>{{ formatMessage(messages.demonetized) }}</div>
	</div>
	<div v-else-if="status === 'monetized'" class="details-list__item">
		<CurrencyIcon aria-hidden="true" />
		<div>{{ formatMessage(messages.monetized) }}</div>
	</div>
</template>

<script setup lang="ts">
import { CurrencyIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import { modrinthClient } from '../../utils/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	monetized: { id: 'monetizationBadge.monetized', defaultMessage: 'Monetized' },
	demonetized: { id: 'monetizationBadge.demonetized', defaultMessage: 'Not monetized' },
	forceDemonetized: {
		id: 'monetizationBadge.forceDemonetized',
		defaultMessage: 'Monetization disabled',
	},
	forceDemonetizedTitle: {
		id: 'monetizationBadge.forceDemonetizedTitle',
		defaultMessage: 'Monetization on this project has been disabled by Modrinth staff',
	},
})

const props = defineProps<{ projectSlug: string }>()

const status = ref<'monetized' | 'demonetized' | 'force-demonetized' | null>(null)

onMounted(async () => {
	try {
		const project = await modrinthClient.labrinth.projects_v3.get(props.projectSlug)
		status.value = project.monetization_status
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load monetization status:', err)
	}
})
</script>
