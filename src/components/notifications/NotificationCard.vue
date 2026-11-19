<template>
	<!-- SmartClickable's grid column grows with its content unless capped to the card width -->
	<div class="[&>.smart-clickable]:grid-cols-[minmax(0,1fr)]">
		<SmartClickable class="w-full">
			<template #clickable>
				<a
					:href="resolveHref(notification.link)"
					class="no-outline no-click-animation rounded-xl"
					@click.prevent="emit('open')"
				></a>
			</template>
			<div
				class="smart-clickable:outline-on-focus smart-clickable:highlight-on-hover group flex gap-2 rounded-2xl border-[1px] border-solid border-surface-4 !p-4 transition-all"
				:class="raised ? 'bg-surface-3' : 'bg-bg'"
			>
				<DoubleIcon class="flex-shrink-0">
					<template #primary>
						<a
							v-if="avatar"
							:href="resolveHref(avatar.path)"
							tabindex="-1"
							class="smart-clickable:allow-pointer-events"
							@click.stop.prevent="emit('navigate', avatar.path)"
						>
							<Avatar size="xs" :src="avatar.src" aria-hidden="true" />
						</a>
						<Avatar v-else size="xs" aria-hidden="true" />
					</template>
					<template #secondary>
						<ScaleIcon
							v-if="
								notification.type === 'moderator_message' || notification.type === 'status_change'
							"
							class="text-[var(--color-orange)]"
						/>
						<UserPlusIcon
							v-else-if="
								(notification.type === 'team_invite' && extra?.project) ||
								(notification.type === 'organization_invite' && extra?.organization)
							"
							class="text-[var(--color-blue)]"
						/>
						<VersionIcon
							v-else-if="notification.type === 'project_update' && extra?.project && extra?.version"
							class="text-contrast"
						/>
						<BellIcon v-else class="text-contrast" />
					</template>
				</DoubleIcon>
				<div class="w-0 min-w-0 flex-1 pr-2">
					<div class="break-words font-semibold text-contrast">{{ title }}</div>
					<div class="mt-1 flex items-center gap-1 text-sm text-secondary">
						<CalendarIcon aria-hidden="true" />
						{{ formatRelativeTime(notification.created) }}
					</div>
				</div>
				<div class="smart-clickable:allow-pointer-events flex items-center gap-2 self-stretch">
					<template v-if="isInvite && !notification.read">
						<IconButton
							type="colored"
							color="brand"
							:circular="false"
							:label="formatMessage(messages['notificationsIndicator.acceptInvite'])"
							@click.stop.prevent="emit('accept')"
						>
							<CheckIcon />
						</IconButton>
						<IconButton
							type="colored"
							color="red"
							:circular="false"
							:label="formatMessage(messages['notificationsIndicator.declineInvite'])"
							@click.stop.prevent="emit('decline')"
						>
							<XIcon />
						</IconButton>
					</template>
					<IconButton
						v-else-if="!notification.read"
						:circular="false"
						:label="formatMessage(messages['notificationsIndicator.markAsRead'])"
						@click.stop.prevent="emit('markRead')"
					>
						<CheckIcon />
					</IconButton>
				</div>
			</div>
		</SmartClickable>
	</div>
</template>

<script setup lang="ts">
import {
	BellIcon,
	CalendarIcon,
	CheckIcon,
	ScaleIcon,
	UserPlusIcon,
	VersionIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Avatar,
	defineMessages,
	DoubleIcon,
	IconButton,
	SmartClickable,
	useRelativeTime,
	useVIntl,
} from '@modrinth/ui'
import { computed } from 'vue'

import type { Notification } from '../../features/notifications/notifications'

const props = defineProps<{
	notification: Notification
	resolveHref: (path: string) => string
	// For cards that sit directly on the page background
	raised?: boolean
}>()

const emit = defineEmits<{
	open: []
	navigate: [path: string]
	accept: []
	decline: []
	markRead: []
}>()

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()

const messages = defineMessages({
	'notificationsIndicator.projectUpdated': {
		id: 'notificationsIndicator.projectUpdated',
		defaultMessage: '{title} has been updated',
	},
	'notificationsIndicator.acceptInvite': {
		id: 'notificationsIndicator.acceptInvite',
		defaultMessage: 'Accept invite',
	},
	'notificationsIndicator.declineInvite': {
		id: 'notificationsIndicator.declineInvite',
		defaultMessage: 'Decline invite',
	},
	'notificationsIndicator.markAsRead': {
		id: 'notificationsIndicator.markAsRead',
		defaultMessage: 'Mark as read',
	},
})

const extra = computed(() => props.notification.extra_data)

const isInvite = computed(
	() =>
		props.notification.type === 'team_invite' || props.notification.type === 'organization_invite',
)

const avatar = computed(() => {
	const { project, organization, user } = extra.value ?? {}
	if (project) return { path: `/project/${project.slug}`, src: project.icon_url }
	if (organization)
		return { path: `/organization/${organization.slug}`, src: organization.icon_url }
	if (user) return { path: `/user/${user.username}`, src: user.avatar_url }
	return null
})

const title = computed(() =>
	props.notification.type === 'project_update' && extra.value?.project
		? formatMessage(messages['notificationsIndicator.projectUpdated'], {
				title: extra.value.project.name,
			})
		: props.notification.title,
)
</script>
