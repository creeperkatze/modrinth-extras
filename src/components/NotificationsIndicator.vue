<template>
	<ButtonStyled v-if="userId !== false" type="transparent">
		<OverflowMenu
			ref="notificationsOverflow"
			:dropdown-id="effectiveDropdownId"
			class="btn-dropdown-animation relative flex items-center gap-1 rounded-xl bg-transparent px-2 py-1"
			:options="[]"
			@dblclick="handleViewAllNotifications"
		>
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
			<template #menu-header>
				<div class="notifications-dropdown flex flex-col p-2">
					<div class="flex items-center justify-between gap-2 rounded-lg">
						<button class="iconified-button" @click="handleViewAllNotifications">
							<BellIcon aria-hidden="true" />
							{{ formatMessage(messages['notificationsIndicator.viewAll']) }}
						</button>
						<button class="iconified-button" @click="handleViewHistory">
							<HistoryIcon />
							{{ formatMessage(messages['notificationsIndicator.viewHistory']) }}
						</button>
						<button
							v-if="unreadCount > 0"
							class="iconified-button danger-button"
							@click="handleMarkAllAsRead"
						>
							<CheckCheckIcon />
							{{ formatMessage(messages['notificationsIndicator.markAllAsRead']) }}
						</button>
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
							<SmartClickable
								v-for="notif in paginatedNotifications"
								:key="notif.id"
								class="w-full"
							>
								<template #clickable>
									<a
										:href="resolveLink(notif.link)"
										class="no-outline no-click-animation rounded-xl"
										@click.prevent="handleNotificationClick(notif)"
									></a>
								</template>
								<div
									class="smart-clickable:outline-on-focus smart-clickable:highlight-on-hover group flex gap-2 rounded-2xl border-[1px] border-solid border-surface-4 bg-bg !p-4 transition-all"
								>
									<DoubleIcon class="flex-shrink-0">
										<template #primary>
											<a
												v-if="notif.extra_data?.project"
												:href="
													resolveLink(
														`/project/${(notif.extra_data as NotificationExtraData).project!.slug}`,
													)
												"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="
													navigate(
														`/project/${(notif.extra_data as NotificationExtraData).project!.slug}`,
													)
												"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as NotificationExtraData).project!.icon_url"
													aria-hidden="true"
												/>
											</a>
											<a
												v-else-if="notif.extra_data?.organization"
												:href="
													resolveLink(
														`/organization/${(notif.extra_data as NotificationExtraData).organization!.slug}`,
													)
												"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="
													navigate(
														`/organization/${(notif.extra_data as NotificationExtraData).organization!.slug}`,
													)
												"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as NotificationExtraData).organization!.icon_url"
													aria-hidden="true"
												/>
											</a>
											<a
												v-else-if="notif.extra_data?.user"
												:href="
													resolveLink(
														`/user/${(notif.extra_data as NotificationExtraData).user!.username}`,
													)
												"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="
													navigate(
														`/user/${(notif.extra_data as NotificationExtraData).user!.username}`,
													)
												"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as NotificationExtraData).user!.avatar_url"
													aria-hidden="true"
												/>
											</a>
											<Avatar v-else size="xs" aria-hidden="true" />
										</template>
										<template #secondary>
											<ScaleIcon
												v-if="notif.type === 'moderator_message' || notif.type === 'status_change'"
												class="text-[var(--color-orange)]"
											/>
											<UserPlusIcon
												v-else-if="notif.type === 'team_invite' && notif.extra_data?.project"
												class="text-[var(--color-blue)]"
											/>
											<UserPlusIcon
												v-else-if="
													notif.type === 'organization_invite' && notif.extra_data?.organization
												"
												class="text-[var(--color-blue)]"
											/>
											<VersionIcon
												v-else-if="
													notif.type === 'project_update' &&
													notif.extra_data?.project &&
													notif.extra_data?.version
												"
												class="text-contrast"
											/>
											<BellIcon v-else class="text-contrast" />
										</template>
									</DoubleIcon>
									<div class="w-0 min-w-0 flex-1 pr-2">
										<div class="break-words font-semibold text-contrast">
											{{
												notif.type === 'project_update' && notif.extra_data?.project
													? formatMessage(messages['notificationsIndicator.projectUpdated'], {
															title: (notif.extra_data as NotificationExtraData).project!.title,
														})
													: notif.title
											}}
										</div>
										<div class="mt-1 flex items-center gap-1 text-sm text-secondary">
											<CalendarIcon aria-hidden="true" />
											{{ formatRelativeTime(notif.created) }}
										</div>
									</div>
									<div class="smart-clickable:allow-pointer-events flex gap-2">
										<button
											v-if="
												(notif.type === 'team_invite' || notif.type === 'organization_invite') &&
												!notif.read
											"
											class="iconified-button square-button brand-button [&>svg]:!mr-0"
											@click.stop.prevent="handleAcceptInvite(notif)"
										>
											<CheckIcon />
										</button>
										<button
											v-if="
												(notif.type === 'team_invite' || notif.type === 'organization_invite') &&
												!notif.read
											"
											class="iconified-button square-button danger-button [&>svg]:!mr-0"
											@click.stop.prevent="handleDeclineInvite(notif)"
										>
											<XIcon />
										</button>
										<button
											v-else-if="!notif.read"
											class="iconified-button square-button [&>svg]:!mr-0"
											@click.stop.prevent="handleMarkAsRead(notif)"
										>
											<CheckIcon />
										</button>
									</div>
								</div>
							</SmartClickable>
						</div>
					</ScrollablePanel>
					<div v-if="totalPages > 1" class="mt-2 flex justify-end">
						<Pagination :page="currentPage" :count="totalPages" @switch-page="goToPage" />
					</div>
				</div>
			</template>
		</OverflowMenu>
	</ButtonStyled>
</template>

<script setup lang="ts">
import {
	BellIcon,
	CalendarIcon,
	CheckCheckIcon,
	CheckIcon,
	DropdownIcon,
	HistoryIcon,
	ScaleIcon,
	UserPlusIcon,
	VersionIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Avatar,
	ButtonStyled,
	defineMessages,
	DoubleIcon,
	OverflowMenu,
	Pagination,
	ScrollablePanel,
	SmartClickable,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import { apiFetch, invalidateTokenCache } from '../helpers/api'
import {
	fetchExtraNotificationData,
	fetchNotifications,
	groupNotifications,
	markNotificationsAsRead,
	type Notification,
	type NotificationBody,
	type NotificationExtraData,
	syncToBackground,
} from '../helpers/notifications'
import { navigate, resolveLink } from '../helpers/page-router'
import { acceptTeamInvite, removeSelfFromTeam } from '../helpers/teams'

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
	'notificationsIndicator.projectUpdated': {
		id: 'notificationsIndicator.projectUpdated',
		defaultMessage: '{title} has been updated',
	},
})

const props = defineProps({
	dropdownId: {
		type: String,
		default: '',
	},
})

const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto', style: 'long' })
function formatRelativeTime(value: Date | number | string | null | undefined): string {
	if (value == null) return ''
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	const diff = date.getTime() - Date.now()
	const abs = Math.abs(diff)
	if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second')
	if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
	if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
	if (abs < 604_800_000) return rtf.format(Math.round(diff / 86_400_000), 'day')
	if (abs < 2_629_746_000) return rtf.format(Math.round(diff / 604_800_000), 'week')
	if (abs < 31_556_952_000) return rtf.format(Math.round(diff / 2_629_746_000), 'month')
	return rtf.format(Math.round(diff / 31_556_952_000), 'year')
}

const instanceId = Math.random().toString(36).slice(2)
const effectiveDropdownId = computed(
	() => props.dropdownId || `notifications-dropdown-${instanceId}`,
)

// Auth state
const userId = ref<string | null | false>(null)

const notificationsData = ref<Notification[] | null>(null)

async function refreshNotifications() {
	if (!userId.value) return
	try {
		const notifs = await fetchNotifications(userId.value)
		syncToBackground(notifs)
		notificationsData.value = await fetchExtraNotificationData(notifs)
	} catch (err) {
		console.warn('[Modrinth Extras] Failed to fetch notifications:', err)
	}
}

function hasAuthCookie(): boolean {
	return document.cookie.split('; ').some((row) => row.startsWith('auth-token='))
}

async function tryAuth(): Promise<boolean> {
	try {
		const user = (await apiFetch('user')) as { id: string }
		userId.value = user.id
		await refreshNotifications()
		return true
	} catch {
		return false
	}
}

const recentNotifications = computed(() => {
	if (!notificationsData.value) return []
	return groupNotifications(notificationsData.value.filter((n) => !n.read))
})

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

const notificationsOverflow = ref<InstanceType<typeof OverflowMenu> | null>(null)
let authWatchInterval: ReturnType<typeof setInterval> | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
	if (!(await tryAuth())) {
		userId.value = false
	}

	// Watches cookie, signs in when cookie appears, signs out when it disappears
	authWatchInterval = setInterval(async () => {
		const cookie = hasAuthCookie()
		if (userId.value && !cookie) {
			invalidateTokenCache()
			userId.value = false
			notificationsData.value = null
		} else if (!userId.value && cookie) {
			invalidateTokenCache()
			await tryAuth()
		}
	}, 1_000)

	refreshInterval = setInterval(() => {
		if (userId.value) refreshNotifications()
	}, 60_000)
})

onBeforeUnmount(() => {
	if (authWatchInterval) clearInterval(authWatchInterval)
	if (refreshInterval) clearInterval(refreshInterval)
})

function syncBadgeCount() {
	browser.runtime.sendMessage({ type: 'badge-count', count: unreadCount.value }).catch(() => {})
}

async function handleAcceptInvite(notif: Notification) {
	try {
		if (notificationsData.value) {
			const n = notificationsData.value.find((n) => n.id === notif.id)
			if (n) n.read = true
		}
		syncBadgeCount()
		await acceptTeamInvite((notif.body as NotificationBody).team_id as string)
		markNotificationsAsRead([notif.id]).catch((err) =>
			console.warn('[Modrinth Extras] Error marking as read:', err),
		)
	} catch (err) {
		console.warn('[Modrinth Extras] Error accepting invite:', err)
	}
}

async function handleDeclineInvite(notif: Notification) {
	try {
		if (notificationsData.value) {
			const n = notificationsData.value.find((n) => n.id === notif.id)
			if (n) n.read = true
		}
		syncBadgeCount()
		await removeSelfFromTeam(
			(notif.body as NotificationBody).team_id as string,
			userId.value as string,
		)
		markNotificationsAsRead([notif.id]).catch((err) =>
			console.warn('[Modrinth Extras] Error marking as read:', err),
		)
	} catch (err) {
		console.warn('[Modrinth Extras] Error declining invite:', err)
	}
}

async function handleMarkAsRead(notif: Notification) {
	try {
		const ids = [notif.id, ...(notif.grouped_notifs?.map((n) => n.id) ?? [])]
		if (notificationsData.value) {
			for (const id of ids) {
				const n = notificationsData.value.find((n) => n.id === id)
				if (n) n.read = true
			}
		}
		syncBadgeCount()
		markNotificationsAsRead(ids).catch((err) =>
			console.warn('[Modrinth Extras] Error marking as read:', err),
		)
	} catch (err) {
		console.warn('[Modrinth Extras] Error marking as read:', err)
	}
}

async function handleMarkAllAsRead() {
	try {
		const ids = notificationsData.value?.filter((n) => !n.read).map((n) => n.id) ?? []
		if (notificationsData.value) {
			for (const n of notificationsData.value) n.read = true
		}
		syncBadgeCount()
		markNotificationsAsRead(ids).catch((err) =>
			console.warn('[Modrinth Extras] Error marking all as read:', err),
		)
	} catch (err) {
		console.warn('[Modrinth Extras] Error marking all as read:', err)
	}
}

function handleViewAllNotifications() {
	notificationsOverflow.value?.close()
	navigate('/dashboard/notifications')
}

function handleViewHistory() {
	notificationsOverflow.value?.close()
	navigate('/dashboard/notifications/history')
}

async function handleNotificationClick(notif: Notification) {
	notificationsOverflow.value?.close()
	if (!notif.read) handleMarkAsRead(notif)
	navigate(notif.link)
}
</script>

<style scoped>
:deep(.page-number-container > div) {
	color: var(--color-secondary);
}
</style>
