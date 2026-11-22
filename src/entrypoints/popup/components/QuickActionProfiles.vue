<template>
	<div class="flex flex-col gap-3">
		<template v-if="profiles.length > 0">
			<div class="flex items-center justify-between gap-4">
				<span class="min-w-0 text-sm font-medium text-contrast">
					{{ formatMessage(messages['quickActionProfiles.profile']) }}
				</span>
				<div class="w-40 shrink-0">
					<CompactCombobox
						:options="profileItems"
						:model-value="settings.quickActionProfiles.selected"
						@update:model-value="selectQuickActionProfile"
					/>
				</div>
			</div>
			<div v-if="selected" class="flex items-center justify-between gap-4">
				<span class="text-sm font-medium text-contrast">
					{{ formatMessage(messages['quickActionProfiles.name']) }}
				</span>
				<Input
					ref="nameInput"
					v-model="nameDraft"
					size="small"
					autocomplete="off"
					:maxlength="40"
					:aria-label="formatMessage(messages['quickActionProfiles.name'])"
					class="w-40"
					@blur="nameDraft = selected.name"
				/>
			</div>
		</template>
		<div class="flex flex-wrap gap-2">
			<Button size="sm" class="w-fit" :disabled="full" @click="create">
				<PlusIcon aria-hidden="true" />
				{{
					formatMessage(
						messages[
							profiles.length > 0 ? 'quickActionProfiles.saveAsNew' : 'quickActionProfiles.save'
						],
					)
				}}
			</Button>
			<Button
				v-if="selected"
				size="sm"
				color="red"
				class="w-fit"
				@click="deleteQuickActionProfile(selected.id)"
			>
				<TrashIcon aria-hidden="true" />
				{{ formatMessage(messages['quickActionProfiles.delete']) }}
			</Button>
		</div>
		<span v-if="full" class="text-sm text-secondary">
			{{ formatMessage(messages['quickActionProfiles.limit'], { max: MAX_QUICK_ACTION_PROFILES }) }}
		</span>
		<hr class="m-0 border-0 border-t border-solid border-surface-4" />
	</div>
</template>

<script setup lang="ts">
import { PlusIcon, TrashIcon } from '@modrinth/assets'
import { Button, defineMessages, formatLoader, Input, useVIntl } from '@modrinth/ui'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

import CompactCombobox from '../../../components/ui/CompactCombobox.vue'
import { MAX_QUICK_ACTION_PROFILES } from '../../../core/settings'
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
	'quickActionProfiles.none': { id: 'quickActionProfiles.none', defaultMessage: 'None' },
	'quickActionProfiles.name': { id: 'quickActionProfiles.name', defaultMessage: 'Name' },
	'quickActionProfiles.save': {
		id: 'quickActionProfiles.save',
		defaultMessage: 'Save as profile',
	},
	'quickActionProfiles.saveAsNew': {
		id: 'quickActionProfiles.saveAsNew',
		defaultMessage: 'Save as new profile',
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

const profiles = computed(() => settings.quickActionProfiles.profiles)
const full = computed(() => profiles.value.length >= MAX_QUICK_ACTION_PROFILES)
const selected = computed(() => selectedQuickActionProfile())

const profileItems = computed(() => [
	{ label: formatMessage(messages['quickActionProfiles.none']), value: '' },
	...profiles.value.map((profile) => ({ label: profile.name, value: profile.id })),
])

const nameInput = useTemplateRef<InstanceType<typeof Input>>('nameInput')
const nameDraft = ref('')

// An emptied name isn't saved, and leaving the field brings the saved one back
watch(
	() => selected.value?.name,
	(name) => (nameDraft.value = name ?? ''),
	{ immediate: true },
)
watch(nameDraft, (name) => {
	const trimmed = name.trim()
	if (selected.value && trimmed && trimmed !== selected.value.name) {
		renameQuickActionProfile(selected.value.id, trimmed)
	}
})

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

async function create() {
	createQuickActionProfile(suggestedName())
	await nextTick()
	nameInput.value?.focus()
	nameInput.value?.select()
}
</script>
