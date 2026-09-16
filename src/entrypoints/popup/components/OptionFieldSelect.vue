<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div :class="dropdownClass ?? 'w-40'">
			<CompactCombobox
				:options="allItems"
				:model-value="modelValue"
				:placeholder="formatMessage(messages['search.any'])"
				:search-placeholder="formatMessage(messages['search.placeholder'])"
				:no-options-message="
					loading
						? formatMessage(messages['search.loading'])
						: formatMessage(messages['search.noResults'])
				"
				:disabled="loading"
				:searchable="searchable"
				:show-search-icon="searchable"
				:select-search-text-on-focus="searchable"
				:max-height="240"
				@update:model-value="$emit('update:modelValue', $event)"
			>
				<template v-if="hasSnapshots" #dropdown-footer>
					<button
						class="flex w-full cursor-pointer items-center justify-center gap-1.5 border-0 border-t border-solid border-surface-5 bg-transparent py-2 text-center text-sm font-semibold text-secondary transition-colors hover:text-contrast"
						@mousedown.prevent
						@click="showSnapshots = !showSnapshots"
					>
						<EyeOffIcon v-if="showSnapshots" class="size-4" />
						<EyeIcon v-else class="size-4" />
						{{
							showSnapshots
								? formatMessage(messages['search.hideSnapshots'])
								: formatMessage(messages['search.showAllVersions'])
						}}
					</button>
				</template>
			</CompactCombobox>
		</div>
	</div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeOffIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import CompactCombobox from '../../../components/ui/CompactCombobox.vue'

export interface SelectItem {
	label: string
	value: string
	snapshot?: boolean
}

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'search.any': { id: 'search.any', defaultMessage: 'Any' },
	'search.placeholder': { id: 'search.placeholder', defaultMessage: 'Search...' },
	'search.loading': { id: 'search.loading', defaultMessage: 'Loading...' },
	'search.noResults': { id: 'search.noResults', defaultMessage: 'No results found' },
	'search.showAllVersions': { id: 'search.showAllVersions', defaultMessage: 'Show all versions' },
	'search.hideSnapshots': { id: 'search.hideSnapshots', defaultMessage: 'Hide snapshots' },
})
const anyItem = computed<SelectItem>(() => ({
	label: formatMessage(messages['search.any']),
	value: '',
}))

const props = withDefaults(
	defineProps<{
		label: string
		modelValue: string
		items?: SelectItem[]
		fetchItems?: () => Promise<SelectItem[]>
		includeAny?: boolean
		dropdownClass?: string
		searchable?: boolean
	}>(),
	{
		items: undefined,
		fetchItems: undefined,
		includeAny: true,
		dropdownClass: undefined,
	},
)

defineEmits<{
	'update:modelValue': [value: string]
}>()

const resolvedItems = ref<SelectItem[]>(props.items ?? [])
const loading = ref(false)
const showSnapshots = ref(false)

const sourceItems = computed(() => props.items ?? resolvedItems.value)
const hasSnapshots = computed(() => sourceItems.value.some((item) => item.snapshot))

const allItems = computed(() => {
	const items = sourceItems.value
		.filter((item) => showSnapshots.value || !item.snapshot)
		.map(({ label, value }) => ({ label, value }))
	return props.includeAny ? [anyItem.value, ...items] : items
})

onMounted(async () => {
	if (props.fetchItems) {
		loading.value = true
		try {
			resolvedItems.value = await props.fetchItems()
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch popup select options:', err)
		} finally {
			loading.value = false
		}
	}
	// Keep a saved snapshot selection visible
	showSnapshots.value = sourceItems.value.some(
		(item) => item.snapshot && item.value === props.modelValue,
	)
})
</script>

<style scoped>
.option-field::before {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 0;
	height: 50%;
	width: 0.5rem;
	border-left: 2px solid var(--surface-5);
	border-bottom: 2px solid var(--surface-5);
	border-bottom-left-radius: 2px;
}

.option-field:not(:last-child)::after {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 50%;
	bottom: -0.5rem;
	border-left: 2px solid var(--surface-5);
}
</style>
