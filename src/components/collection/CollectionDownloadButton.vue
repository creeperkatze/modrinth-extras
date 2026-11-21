<template>
	<Button size="xl" @click="modal?.open()">
		<DownloadIcon aria-hidden="true" />
		{{ formatMessage(messages['collectionDownload.button']) }}
	</Button>
	<CollectionDownloadModal
		ref="modal"
		:collection-id="collectionId"
		:collection-name="collectionName"
	/>
</template>

<script setup lang="ts">
import { DownloadIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'
import { useTemplateRef } from 'vue'

import CollectionDownloadModal from './CollectionDownloadModal.vue'

defineProps<{
	collectionId: string
	collectionName: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'collectionDownload.button': { id: 'collectionDownload.button', defaultMessage: 'Download' },
})

const modal = useTemplateRef<InstanceType<typeof CollectionDownloadModal>>('modal')
</script>
