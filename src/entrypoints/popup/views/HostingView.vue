<template>
	<div class="flex flex-col gap-4 px-3 pb-3">
		<SignInCard
			v-if="accountLoaded && !account"
			:description="formatMessage(messages['popup.hosting.signIn'])"
		/>

		<template v-else-if="account">
			<div
				v-if="!servers && loading"
				class="flex items-center justify-center gap-2 p-6 text-sm text-secondary"
			>
				<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
				{{ formatMessage(messages['popup.hosting.loading']) }}
			</div>

			<EmptyState
				v-else-if="!servers && failed"
				type="error"
				:heading="formatMessage(messages['popup.hosting.failed'])"
			>
				<template #actions>
					<Button @click="refresh">
						<RefreshCwIcon aria-hidden="true" />
						{{ formatMessage(commonMessages.retryButton) }}
					</Button>
				</template>
			</EmptyState>

			<template v-else-if="servers">
				<EmptyState
					v-if="servers.length === 0"
					type="no-items-cart"
					:heading="formatMessage(messages['popup.hosting.emptyTitle'])"
					:description="formatMessage(messages['popup.hosting.emptyDescription'])"
				>
					<template #actions>
						<Button type="colored" color="brand" @click="openModrinth('/hosting')">
							<ServerStackIcon aria-hidden="true" />
							{{ formatMessage(messages['popup.hosting.getServer']) }}
						</Button>
					</template>
				</EmptyState>

				<PopupSection v-else :title="formatMessage(messages['popup.hosting.servers'])" bare>
					<template #actions>
						<IconButton
							v-tooltip="formatMessage(messages['popup.hosting.allServers'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.hosting.allServers'])"
							@click="openModrinth('/hosting/manage')"
						>
							<ArrowUpRightIcon aria-hidden="true" />
						</IconButton>
					</template>

					<ServerCard
						v-for="server in servers"
						:key="`${server.id}:${server.status}`"
						:server="server"
					/>
				</PopupSection>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, RefreshCwIcon, ServerStackIcon, SpinnerIcon } from '@modrinth/assets'
import { Button, commonMessages, defineMessages, IconButton, useVIntl } from '@modrinth/ui'

import { fetchHostingServers, type HostingServer } from '../../../features/hosting/servers'
import EmptyState from '../components/EmptyState.vue'
import ServerCard from '../components/hosting/ServerCard.vue'
import PopupSection from '../components/PopupSection.vue'
import SignInCard from '../components/SignInCard.vue'
import { useCachedResource } from '../composables/cached'
import { account, accountLoaded } from '../state/account'
import { openModrinth } from '../utils/tabs'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.hosting.signIn': {
		id: 'popup.hosting.signIn',
		defaultMessage: 'Sign in to see your Modrinth Hosting servers here.',
	},
	'popup.hosting.loading': {
		id: 'popup.hosting.loading',
		defaultMessage: 'Loading your servers...',
	},
	'popup.hosting.failed': {
		id: 'popup.hosting.failed',
		defaultMessage: 'Your servers could not be loaded',
	},
	'popup.hosting.emptyTitle': {
		id: 'popup.hosting.emptyTitle',
		defaultMessage: 'No servers yet',
	},
	'popup.hosting.emptyDescription': {
		id: 'popup.hosting.emptyDescription',
		defaultMessage:
			'Once you have a Modrinth Hosting server, its status and controls show up here.',
	},
	'popup.hosting.getServer': {
		id: 'popup.hosting.getServer',
		defaultMessage: 'Get a server',
	},
	'popup.hosting.servers': {
		id: 'popup.hosting.servers',
		defaultMessage: 'Servers',
	},
	'popup.hosting.allServers': {
		id: 'popup.hosting.allServers',
		defaultMessage: 'Open all servers',
	},
})

// A max age of 0 shows the last list right away and always fetches a fresh one
const {
	data: servers,
	loading,
	failed,
	refresh,
} = useCachedResource<HostingServer[]>(
	() => (account.value ? `hosting-servers:${account.value.id}` : null),
	fetchHostingServers,
	0,
)
</script>
