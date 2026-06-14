<template>
	<Combobox
		class="compact-combobox"
		:options="compactOptions"
		:model-value="modelValue"
		:placeholder="placeholder"
		:disabled="disabled"
		:searchable="searchable"
		:search-placeholder="searchPlaceholder"
		:show-search-icon="showSearchIcon"
		:select-search-text-on-focus="selectSearchTextOnFocus"
		:max-height="maxHeight"
		@update:model-value="$emit('update:modelValue', $event)"
	/>
</template>

<script setup lang="ts">
import { Combobox, type ComboboxOption } from '@modrinth/ui'
import { computed } from 'vue'

type CompactComboboxEntry = ComboboxOption<string> | { type: 'divider' }

const props = withDefaults(
	defineProps<{
		options: CompactComboboxEntry[]
		modelValue?: string
		placeholder?: string
		disabled?: boolean
		searchable?: boolean
		searchPlaceholder?: string
		showSearchIcon?: boolean
		selectSearchTextOnFocus?: boolean
		maxHeight?: number
	}>(),
	{
		modelValue: undefined,
		placeholder: undefined,
		disabled: false,
		searchable: false,
		searchPlaceholder: undefined,
		showSearchIcon: false,
		selectSearchTextOnFocus: false,
		maxHeight: 240,
	},
)

defineEmits<{
	'update:modelValue': [value: string]
}>()

const compactOptions = computed<CompactComboboxEntry[]>(() =>
	props.options.map((option) =>
		'value' in option
			? {
					...option,
					class: [option.class, 'compact-combobox-option'].filter(Boolean).join(' '),
				}
			: option,
	),
)
</script>

<style lang="scss">
.compact-combobox > span[role='button'] {
	min-height: 2rem;
	padding: 0.375rem 0.75rem;
	font-size: var(--font-size-sm);
}

.compact-combobox input {
	height: 2rem;
	font-size: var(--font-size-sm);
}

.compact-combobox svg.size-5 {
	width: 1rem;
	height: 1rem;
}

.compact-combobox svg.rotate-90 {
	transform: rotate(90deg) !important;
}

.compact-combobox svg.-rotate-90 {
	transform: rotate(-90deg) !important;
}

.compact-combobox svg.-translate-y-1\/2.rotate-90 {
	transform: translateY(-50%) rotate(90deg) !important;
}

.compact-combobox svg.-translate-y-1\/2.-rotate-90 {
	transform: translateY(-50%) rotate(-90deg) !important;
}

#teleports [role='listbox']:has(.compact-combobox-option) > div {
	gap: 0.25rem;
	padding: 0.5rem;
}

#teleports .compact-combobox-option {
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
}

#teleports .compact-combobox-option svg {
	width: 1rem;
	height: 1rem;
}
</style>
