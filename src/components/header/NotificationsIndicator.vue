<template>
	<TeleportPopoutMenu
		v-if="userId"
		ref="notificationsPopout"
		type="quiet"
		class="btn-dropdown-animation"
		:label="formatMessage(messages['notificationsIndicator.label'])"
		@dblclick="handleViewAllNotifications"
	>
		<template #trigger>
			<div class="relative flex h-5 flex-shrink-0 items-center justify-center">
				<BellIcon aria-hidden="true" class="h-5 w-5 transform-none" />
				<div
					v-show="unreadCount > 0"
					class="absolute -top-2 left-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-inverted"
				>
					{{ unreadCount }}
				</div>
			</div>
			<DropdownIcon aria-hidden="true" class="h-5 w-5 text-secondary" />
		</template>
		<template #panel>
			<div class="notifications-dropdown flex flex-col">
				<div class="flex items-center justify-between gap-2 rounded-lg">
					<Button @click="handleViewAllNotifications">
						<BellIcon aria-hidden="true" />
						{{ formatMessage(messages['notificationsIndicator.viewAll']) }}
					</Button>
					<Button @click="handleViewHistory">
						<HistoryIcon />
						{{ formatMessage(messages['notificationsIndicator.viewHistory']) }}
					</Button>
					<Button v-if="unreadCount > 0" type="colored" color="red" @click="handleMarkAllAsRead">
						<CheckCheckIcon />
						{{ formatMessage(messages['notificationsIndicator.markAllAsRead']) }}
					</Button>
				</div>
				<div class="mt-4 border-t border-divider"></div>
				<div
					v-if="recentNotifications.length === 0"
					class="flex items-center justify-center rounded-lg bg-transparent py-4 text-secondary"
				>
					{{ formatMessage(messages['notificationsIndicator.noUnread']) }}
				</div>
				<ScrollablePanel style="--_fade-height: 1rem" class="[&__.scrollable-pane]:max-h-[500px]">
					<div class="flex flex-col gap-2">
						<NotificationCard
							v-for="notif in paginatedNotifications"
							:key="notif.id"
							:notification="notif"
							:resolve-href="resolveLink"
							@open="handleNotificationClick(notif)"
							@navigate="navigate"
							@accept="acceptInvite(notif)"
							@decline="declineInvite(notif)"
							@mark-read="markAsRead([notif])"
						/>
					</div>
				</ScrollablePanel>
				<div v-if="totalPages > 1" class="mt-2 flex justify-end">
					<Pagination :page="currentPage" :count="totalPages" @switch-page="goToPage" />
				</div>
			</div>
		</template>
	</TeleportPopoutMenu>
</template>

<script setup lang="ts">
import { BellIcon, CheckCheckIcon, DropdownIcon, HistoryIcon } from '@modrinth/assets'
import {
	Button,
	defineMessages,
	Pagination,
	ScrollablePanel,
	TeleportPopoutMenu,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { navigate, resolveLink } from '../../content/page-router'
import { accountItem } from '../../features/account/account'
import { useNotifications } from '../../features/notifications/actions'
import type { Notification } from '../../features/notifications/notifications'
import NotificationCard from '../notifications/NotificationCard.vue'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'notificationsIndicator.viewAll': {
		id: 'notificationsIndicator.viewAll',
		defaultMessage: 'View all',
	},
	'notificationsIndicator.viewHistory': {
		id: 'notificationsIndicator.viewHistory',
		defaultMessage: 'View history',
	},
	'notificationsIndicator.markAllAsRead': {
		id: 'notificationsIndicator.markAllAsRead',
		defaultMessage: 'Mark all as read',
	},
	'notificationsIndicator.noUnread': {
		id: 'notificationsIndicator.noUnread',
		defaultMessage: 'No unread notifications',
	},
	'notificationsIndicator.label': {
		id: 'notificationsIndicator.label',
		defaultMessage: 'Notifications',
	},
})

const userId = ref<string | null>(null)

const { unread, refresh, markAsRead, acceptInvite, declineInvite } = useNotifications(
	() => userId.value,
)

const recentNotifications = computed(() => unread.value ?? [])

const unreadCount = computed(() => recentNotifications.value.length)

const NOTIFICATIONS_PER_PAGE = 20
const currentPage = ref(1)

const totalPages = computed(() =>
	Math.ceil(recentNotifications.value.length / NOTIFICATIONS_PER_PAGE),
)

const paginatedNotifications = computed(() => {
	const start = (currentPage.value - 1) * NOTIFICATIONS_PER_PAGE
	return recentNotifications.value.slice(start, start + NOTIFICATIONS_PER_PAGE)
})

watch(totalPages, (newTotal) => {
	if (newTotal > 0 && currentPage.value > newTotal) {
		currentPage.value = newTotal
	} else if (newTotal === 0) {
		currentPage.value = 1
	}
})

function goToPage(page: number) {
	if (page >= 1 && page <= totalPages.value) {
		currentPage.value = page
	}
}

const notificationsPopout = ref<InstanceType<typeof TeleportPopoutMenu> | null>(null)
let refreshInterval: ReturnType<typeof setInterval> | null = null
let unwatchAccount: (() => void) | null = null

// Other tabs and the background poll too, so a recent fetch is reused
const REFRESH_MAX_AGE = 30_000

onMounted(async () => {
	unwatchAccount = accountItem.watch((account) => {
		const id = account?.id ?? null
		if (id === userId.value) return
		userId.value = id
		currentPage.value = 1
	})
	userId.value = (await accountItem.getValue())?.id ?? null
	void refresh(REFRESH_MAX_AGE)
	refreshInterval = setInterval(() => {
		if (userId.value) void refresh(REFRESH_MAX_AGE)
	}, 60_000)
})

onBeforeUnmount(() => {
	unwatchAccount?.()
	if (refreshInterval) clearInterval(refreshInterval)
})

function handleMarkAllAsRead() {
	void markAsRead(recentNotifications.value)
}

function handleViewAllNotifications() {
	notificationsPopout.value?.close()
	navigate('/dashboard/notifications')
}

function handleViewHistory() {
	notificationsPopout.value?.close()
	navigate('/dashboard/notifications/history')
}

async function handleNotificationClick(notif: Notification) {
	notificationsPopout.value?.close()
	if (!notif.read) void markAsRead([notif])
	navigate(notif.link)
}
</script>

<style scoped>
:deep(.page-number-container > div) {
	color: var(--color-secondary);
}
</style>
