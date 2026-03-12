<template>
	<ButtonStyled v-if="userId" type="transparent">
		<OverflowMenu
			ref="notificationsOverflow"
			:dropdown-id="effectiveDropdownId"
			class="btn-dropdown-animation relative flex items-center gap-1 rounded-xl bg-transparent px-2 py-1"
			:options="[]"
			@dblclick="handleViewAllNotifications"
		>
			<div class="relative flex h-5 flex-shrink-0 items-center justify-center">
				<BellIcon aria-hidden="true" class="h-5 w-5" style="transform: none" />
				<div
					v-if="unreadCount > 0"
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
							View all
						</button>
						<button class="iconified-button" @click="handleViewHistory">
							<HistoryIcon />
							View history
						</button>
						<button
							v-if="unreadCount > 0"
							class="iconified-button danger-button"
							@click="handleMarkAllAsRead"
						>
							<CheckCheckIcon />
							Mark all as read
						</button>
					</div>
					<div class="mt-4 border-t border-divider"></div>
					<div
						v-if="recentNotifications.length === 0"
						class="flex items-center justify-center rounded-lg bg-transparent py-4 text-secondary"
					>
						No unread notifications
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
												:href="resolveLink(`/project/${(notif.extra_data as PlatformNotificationExtraData).project!.slug}`)"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="navigate(`/project/${(notif.extra_data as PlatformNotificationExtraData).project!.slug}`)"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as PlatformNotificationExtraData).project!.icon_url"
													aria-hidden="true"
												/>
											</a>
											<a
												v-else-if="notif.extra_data?.organization"
												:href="resolveLink(`/organization/${(notif.extra_data as PlatformNotificationExtraData).organization!.slug}`)"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="navigate(`/organization/${(notif.extra_data as PlatformNotificationExtraData).organization!.slug}`)"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as PlatformNotificationExtraData).organization!.icon_url"
													aria-hidden="true"
												/>
											</a>
											<a
												v-else-if="notif.extra_data?.user"
												:href="resolveLink(`/user/${(notif.extra_data as PlatformNotificationExtraData).user!.username}`)"
												tabindex="-1"
												class="smart-clickable:allow-pointer-events"
												@click.stop.prevent="navigate(`/user/${(notif.extra_data as PlatformNotificationExtraData).user!.username}`)"
											>
												<Avatar
													size="xs"
													:src="(notif.extra_data as PlatformNotificationExtraData).user!.avatar_url"
													aria-hidden="true"
												/>
											</a>
											<Avatar v-else size="xs" aria-hidden="true" />
										</template>
										<template #secondary>
											<ScaleIcon
												v-if="
													notif.type === 'moderator_message' ||
													notif.type === 'status_change'
												"
												class="moderation-color"
											/>
											<UserPlusIcon
												v-else-if="notif.type === 'team_invite' && notif.extra_data?.project"
												class="creator-color"
											/>
											<UserPlusIcon
												v-else-if="
													notif.type === 'organization_invite' &&
													notif.extra_data?.organization
												"
												class="creator-color"
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
													? `${(notif.extra_data as PlatformNotificationExtraData).project!.title} has been updated`
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
												(notif.type === 'team_invite' ||
													notif.type === 'organization_invite') &&
												!notif.read
											"
											class="iconified-button square-button brand-button [&>svg]:!mr-0"
											@click.stop.prevent="handleAcceptInvite(notif)"
										>
											<CheckIcon />
										</button>
										<button
											v-if="
												(notif.type === 'team_invite' ||
													notif.type === 'organization_invite') &&
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
	DoubleIcon,
	OverflowMenu,
	Pagination,
	ScrollablePanel,
	SmartClickable,
} from '@modrinth/ui'

import {
	fetchExtraNotificationData,
	groupNotifications,
	markAsRead,
	type PlatformNotification,
	type PlatformNotificationBody,
	type PlatformNotificationExtraData,
} from '../helpers/platform-notifications'
import { acceptTeamInvite, removeSelfFromTeam } from '../helpers/teams'
import { useBaseFetch } from '../composables/useBaseFetch'

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

// Resolve a path or URL to an absolute modrinth.com URL (used for href attributes)
function resolveLink(link: string): string {
	if (link.startsWith('http')) return link
	return 'https://modrinth.com' + link
}

// Navigate using the page's Nuxt/Vue router to avoid full page reloads.
// Vue 3 attaches __vue_app__ to the root mount element (#__nuxt), which
// gives us reliable access to the router without relying on window globals.
function getPageRouter(): { push: (path: string) => void } | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const nuxtRoot = document.getElementById('__nuxt') as any
	return (
		nuxtRoot?.__vue_app__?.config?.globalProperties?.$router ??
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).__nuxt_app?.vueApp?.config?.globalProperties?.$router ??
		null
	)
}

function navigate(path: string) {
	const router = getPageRouter()
	if (router) {
		router.push(path)
	} else {
		window.location.href = resolveLink(path)
	}
}

const router = { push: navigate }

// Stable per-instance ID (replaces Nuxt's useId())
const instanceId = Math.random().toString(36).slice(2)
const effectiveDropdownId = computed(
	() => props.dropdownId || `notifications-dropdown-${instanceId}`,
)

// Auth — populated on mount by fetching /v2/user with the cookie token
const userId = ref<string | null>(null)

// Notifications data
const notificationsData = ref<PlatformNotification[] | null>(null)

async function refreshNotifications() {
	if (!userId.value) return
	try {
		const notifs = await useBaseFetch(`user/${userId.value}/notifications`)
		notificationsData.value = await fetchExtraNotificationData(notifs)
	} catch (err) {
		console.error('[Modrinth Ext] Failed to fetch notifications:', err)
	}
}

onMounted(async () => {
	try {
		const user = await useBaseFetch('user')
		userId.value = user.id
		await refreshNotifications()
	} catch (err) {
		console.error('[Modrinth Ext] Auth failed — are you logged in to modrinth.com?', err)
	}
})


// Computed — unread count and filtered/grouped list
const unreadCount = computed(() => {
	if (!notificationsData.value) return 0
	const grouped = groupNotifications(notificationsData.value.filter((n) => !n.read))
	return grouped.length
})

const recentNotifications = computed(() => {
	if (!notificationsData.value) return []
	return groupNotifications(notificationsData.value.filter((n) => !n.read))
})

// Pagination
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

// Auto-refresh every minute
const REFRESH_INTERVAL = 60_000
const notificationsOverflow = ref<InstanceType<typeof OverflowMenu> | null>(null)
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	refreshInterval = setInterval(() => {
		if (notificationsOverflow.value) refreshNotifications()
	}, REFRESH_INTERVAL)
})

onBeforeUnmount(() => {
	if (refreshInterval) clearInterval(refreshInterval)
})

// Action handlers
async function handleAcceptInvite(notif: PlatformNotification) {
	try {
		if (notificationsData.value) {
			const n = notificationsData.value.find((n) => n.id === notif.id)
			if (n) n.read = true
		}
		await acceptTeamInvite((notif.body as PlatformNotificationBody).team_id as string)
		markAsRead([notif.id]).catch((err) => console.error('Error marking as read:', err))
	} catch (err) {
		console.error('Error accepting invite:', err)
	}
}

async function handleDeclineInvite(notif: PlatformNotification) {
	try {
		if (notificationsData.value) {
			const n = notificationsData.value.find((n) => n.id === notif.id)
			if (n) n.read = true
		}
		await removeSelfFromTeam(
			(notif.body as PlatformNotificationBody).team_id as string,
			userId.value!,
		)
		markAsRead([notif.id]).catch((err) => console.error('Error marking as read:', err))
	} catch (err) {
		console.error('Error declining invite:', err)
	}
}

async function handleMarkAsRead(notif: PlatformNotification) {
	try {
		const ids = [notif.id, ...(notif.grouped_notifs?.map((n) => n.id) ?? [])]
		if (notificationsData.value) {
			for (const id of ids) {
				const n = notificationsData.value.find((n) => n.id === id)
				if (n) n.read = true
			}
		}
		markAsRead(ids).catch((err) => console.error('Error marking as read:', err))
	} catch (err) {
		console.error('Error marking as read:', err)
	}
}

async function handleMarkAllAsRead() {
	try {
		const ids = notificationsData.value?.map((n) => n.id) ?? []
		if (notificationsData.value) {
			for (const n of notificationsData.value) n.read = true
		}
		markAsRead(ids).catch((err) => console.error('Error marking all as read:', err))
	} catch (err) {
		console.error('Error marking all as read:', err)
	}
}

function handleViewAllNotifications() {
	notificationsOverflow.value?.close()
	router.push('/dashboard/notifications')
}

function handleViewHistory() {
	notificationsOverflow.value?.close()
	router.push('/dashboard/notifications/history')
}

async function handleNotificationClick(notif: PlatformNotification) {
	notificationsOverflow.value?.close()
	if (!notif.read) handleMarkAsRead(notif)
	navigate(notif.link)
}
</script>

<style scoped>
.moderation-color {
	color: var(--color-orange);
}

.creator-color {
	color: var(--color-blue);
}

:deep(.page-number-container > div) {
	color: var(--color-secondary);
}
</style>
