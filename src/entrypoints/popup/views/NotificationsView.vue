<template>
	<div class="flex flex-col gap-4 px-3 pb-3">
		<SignInCard
			v-if="accountLoaded && !account"
			:description="formatMessage(messages['popup.notifications.signIn'])"
		/>

		<template v-else-if="account && loaded">
			<EmptyState
				v-if="!unread && failed"
				type="error"
				:heading="formatMessage(messages['popup.notifications.failed'])"
			>
				<template #actions>
					<Button @click="refresh()">
						<RefreshCwIcon aria-hidden="true" />
						{{ formatMessage(commonMessages.retryButton) }}
					</Button>
				</template>
			</EmptyState>

			<div
				v-else-if="!unread"
				class="flex items-center justify-center gap-2 p-6 text-sm text-secondary"
			>
				<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
				{{ formatMessage(messages['popup.notifications.loading']) }}
			</div>

			<template v-else>
				<EmptyState
					v-if="unread.length === 0"
					type="empty-inbox"
					:heading="formatMessage(messages['popup.notifications.emptyTitle'])"
					:description="formatMessage(messages['popup.notifications.emptyDescription'])"
				>
					<template #actions>
						<Button @click="openModrinth('/dashboard/notifications/history')">
							<HistoryIcon aria-hidden="true" />
							{{ formatMessage(messages['popup.notifications.viewHistory']) }}
						</Button>
					</template>
				</EmptyState>

				<PopupSection v-else :title="formatMessage(messages['popup.notifications.unread'])" bare>
					<template #actions>
						<IconButton
							v-tooltip="formatMessage(messages['popup.notifications.markAllAsRead'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.notifications.markAllAsRead'])"
							@click="markAsRead(unread)"
						>
							<CheckCheckIcon aria-hidden="true" />
						</IconButton>
						<IconButton
							v-tooltip="formatMessage(messages['popup.notifications.viewHistory'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.notifications.viewHistory'])"
							@click="openModrinth('/dashboard/notifications/history')"
						>
							<HistoryIcon aria-hidden="true" />
						</IconButton>
						<IconButton
							v-tooltip="formatMessage(messages['popup.notifications.viewAll'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.notifications.viewAll'])"
							@click="openModrinth('/dashboard/notifications')"
						>
							<ArrowUpRightIcon aria-hidden="true" />
						</IconButton>
					</template>

					<NotificationCard
						v-for="notification in unread"
						:key="notification.id"
						:notification="notification"
						:resolve-href="modrinthUrl"
						raised
						@open="openNotification(notification)"
						@navigate="openModrinth"
						@accept="acceptInvite(notification)"
						@decline="declineInvite(notification)"
						@mark-read="markAsRead([notification])"
					/>
				</PopupSection>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	CheckCheckIcon,
	HistoryIcon,
	RefreshCwIcon,
	SpinnerIcon,
} from '@modrinth/assets'
import { Button, commonMessages, defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { onMounted } from 'vue'

import NotificationCard from '../../../components/notifications/NotificationCard.vue'
import { useNotifications } from '../../../features/notifications/actions'
import type { Notification } from '../../../features/notifications/notifications'
import EmptyState from '../components/EmptyState.vue'
import PopupSection from '../components/PopupSection.vue'
import SignInCard from '../components/SignInCard.vue'
import { account, accountLoaded } from '../state/account'
import { modrinthUrl, openModrinth } from '../utils/tabs'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.notifications.signIn': {
		id: 'popup.notifications.signIn',
		defaultMessage: 'Sign in to see your notifications here.',
	},
	'popup.notifications.loading': {
		id: 'popup.notifications.loading',
		defaultMessage: 'Loading your notifications...',
	},
	'popup.notifications.failed': {
		id: 'popup.notifications.failed',
		defaultMessage: 'Notifications could not be loaded',
	},
	'popup.notifications.emptyTitle': {
		id: 'popup.notifications.emptyTitle',
		defaultMessage: 'No unread notifications',
	},
	'popup.notifications.emptyDescription': {
		id: 'popup.notifications.emptyDescription',
		defaultMessage: 'Project updates, invites and messages from moderators show up here.',
	},
	'popup.notifications.unread': {
		id: 'popup.notifications.unread',
		defaultMessage: 'Unread',
	},
	'popup.notifications.markAllAsRead': {
		id: 'popup.notifications.markAllAsRead',
		defaultMessage: 'Mark all as read',
	},
	'popup.notifications.viewHistory': {
		id: 'popup.notifications.viewHistory',
		defaultMessage: 'View history',
	},
	'popup.notifications.viewAll': {
		id: 'popup.notifications.viewAll',
		defaultMessage: 'View all',
	},
})

const { unread, loaded, failed, refresh, markAsRead, acceptInvite, declineInvite } =
	useNotifications(() => account.value?.id)

onMounted(() => refresh())

async function openNotification(notification: Notification) {
	// Opening the page closes the popup, which would cancel the request
	await markAsRead([notification])
	await openModrinth(notification.link)
}
</script>
