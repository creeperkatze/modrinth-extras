<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div :class="dropdownClass ?? 'w-40'">
			<CompactCombobox
				:options="allItems"
				:model-value="modelValue"
				:placeholder="formatMessage(messages['search.any'])"
				:search-placeholder="formatMessage(messages['search.placeholder'])"
				:disabled="loading"
				:searchable="searchable"
				:show-search-icon="searchable"
				:select-search-text-on-focus="searchable"
				:max-height="240"
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import CompactCombobox from '../../../components/ui/CompactCombobox.vue'

export interface SelectItem {
	label: string
	value: string
}

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'search.any': { id: 'search.any', defaultMessage: 'Any' },
	'search.placeholder': { id: 'search.placeholder', defaultMessage: 'Search...' },
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

const allItems = computed<SelectItem[]>(() => {
	const items = props.items ?? resolvedItems.value
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
