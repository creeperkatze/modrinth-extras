<template>
	<div class="flex flex-col gap-3">
		<Button v-if="profiles.length === 0" size="sm" class="w-fit" @click="create">
			<PlusIcon aria-hidden="true" />
			{{ formatMessage(messages['quickActionProfiles.save']) }}
		</Button>
		<div v-else class="flex items-center justify-between gap-4">
			<span class="min-w-0 text-sm font-medium text-contrast">
				{{ formatMessage(messages['quickActionProfiles.profile']) }}
			</span>
			<div class="flex shrink-0 items-center gap-1">
				<Input
					v-if="renaming"
					ref="nameInput"
					v-model="nameDraft"
					size="small"
					autocomplete="off"
					:maxlength="40"
					:aria-label="formatMessage(messages['quickActionProfiles.name'])"
					class="w-40"
					@keydown.enter="finishRename"
					@keydown.esc.stop="cancelRename"
					@blur="finishRename"
				/>
				<div v-else class="w-40">
					<CompactCombobox
						:options="profileItems"
						:model-value="selected?.id"
						:placeholder="formatMessage(messages['quickActionProfiles.choose'])"
						@update:model-value="pick"
					/>
				</div>
				<IconButton
					v-tooltip="formatMessage(messages['quickActionProfiles.rename'])"
					type="quiet"
					size="sm"
					:disabled="!selected || renaming"
					:label="formatMessage(messages['quickActionProfiles.rename'])"
					@click="startRename"
				>
					<EditIcon aria-hidden="true" />
				</IconButton>
				<IconButton
					v-tooltip="formatMessage(messages['quickActionProfiles.delete'])"
					type="quiet"
					color="red"
					size="sm"
					:disabled="!selected || renaming"
					:label="formatMessage(messages['quickActionProfiles.delete'])"
					@click="selected && deleteQuickActionProfile(selected.id)"
				>
					<TrashIcon aria-hidden="true" />
				</IconButton>
			</div>
		</div>
		<hr class="m-0 border-0 border-t border-solid border-surface-4" />
	</div>
</template>

<script setup lang="ts">
import { EditIcon, PlusIcon, TrashIcon } from '@modrinth/assets'
import { Button, defineMessages, formatLoader, IconButton, Input, useVIntl } from '@modrinth/ui'
import { computed, nextTick, ref, useTemplateRef } from 'vue'

import CompactCombobox from '../../../components/ui/CompactCombobox.vue'
import {
	MAX_QUICK_ACTION_PROFILES,
	quickActionProfiles,
} from '../../../features/quick-actions/profiles'
import {
	createQuickActionProfile,
	deleteQuickActionProfile,
	renameQuickActionProfile,
	selectQuickActionProfile,
	selectedQuickActionProfile,
	settings,
} from '../state/settings'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'quickActionProfiles.profile': { id: 'quickActionProfiles.profile', defaultMessage: 'Profile' },
	'quickActionProfiles.choose': {
		id: 'quickActionProfiles.choose',
		defaultMessage: 'Choose a profile',
	},
	'quickActionProfiles.name': { id: 'quickActionProfiles.name', defaultMessage: 'Profile name' },
	'quickActionProfiles.save': {
		id: 'quickActionProfiles.save',
		defaultMessage: 'Save as profile',
	},
	'quickActionProfiles.new': { id: 'quickActionProfiles.new', defaultMessage: 'New profile' },
	'quickActionProfiles.rename': {
		id: 'quickActionProfiles.rename',
		defaultMessage: 'Rename profile',
	},
	'quickActionProfiles.delete': {
		id: 'quickActionProfiles.delete',
		defaultMessage: 'Delete profile',
	},
	'quickActionProfiles.defaultName': {
		id: 'quickActionProfiles.defaultName',
		defaultMessage: 'Profile',
	},
	'quickActionProfiles.limit': {
		id: 'quickActionProfiles.limit',
		defaultMessage: 'You can save up to {max} profiles.',
	},
})

const NEW_PROFILE = 'new'

const profiles = computed(() => quickActionProfiles.state.items)
const full = computed(() => profiles.value.length >= MAX_QUICK_ACTION_PROFILES)
const selected = computed(() => selectedQuickActionProfile())

const profileItems = computed(() => [
	...profiles.value.map((profile) => ({ label: profile.name, value: profile.id })),
	{ type: 'divider' as const },
	{
		label: formatMessage(messages['quickActionProfiles.new']),
		value: NEW_PROFILE,
		icon: PlusIcon,
		disabled: full.value,
		subLabel: full.value
			? formatMessage(messages['quickActionProfiles.limit'], { max: MAX_QUICK_ACTION_PROFILES })
			: undefined,
	},
])

function pick(value: string) {
	if (value === NEW_PROFILE) create()
	else selectQuickActionProfile(value)
}

const nameInput = useTemplateRef<InstanceType<typeof Input>>('nameInput')
const nameDraft = ref('')
const renaming = ref(false)

async function startRename() {
	if (!selected.value) return
	nameDraft.value = selected.value.name
	renaming.value = true
	await nextTick()
	nameInput.value?.focus()
	nameInput.value?.select()
}

// Enter unmounts the field, which blurs it again
function finishRename() {
	if (!renaming.value) return
	renaming.value = false
	const trimmed = nameDraft.value.trim()
	if (selected.value && trimmed && trimmed !== selected.value.name) {
		renameQuickActionProfile(selected.value.id, trimmed)
	}
}

function cancelRename() {
	renaming.value = false
}

// Named after what it downloads, like "Fabric 1.21.1"
function suggestedName(): string {
	const { modLoader, gameVersion } = settings.projectCardActions
	const parts = [modLoader ? formatLoader(formatMessage, modLoader) : '', gameVersion]
	const base =
		parts.filter(Boolean).join(' ') || formatMessage(messages['quickActionProfiles.defaultName'])
	const taken = new Set(profiles.value.map((profile) => profile.name))
	if (!taken.has(base)) return base
	let number = 2
	while (taken.has(`${base} ${number}`)) number++
	return `${base} ${number}`
}

function create() {
	createQuickActionProfile(suggestedName())
	void startRename()
}
</script>
