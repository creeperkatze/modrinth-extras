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
		trigger-class="compact-combobox-trigger"
		dropdown-class="compact-combobox-dropdown"
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
.compact-combobox-trigger {
	min-height: 2rem;
	padding: 0.375rem 0.75rem;
	gap: 0.5rem;
}

.compact-combobox-trigger > div,
.compact-combobox-trigger > div > div {
	gap: 0.5rem;
}

.compact-combobox-trigger span,
.compact-combobox input,
.compact-combobox-dropdown .compact-combobox-option {
	font-size: var(--font-size-sm);
}

.compact-combobox input {
	height: 2rem;
	padding-top: 0.375rem;
	padding-bottom: 0.375rem;
}

.compact-combobox svg.size-5,
.compact-combobox-dropdown .compact-combobox-option svg {
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

.compact-combobox-dropdown .compact-combobox-option {
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
}

.compact-combobox-dropdown .compact-combobox-option > div,
.compact-combobox-dropdown .compact-combobox-option > div > div,
.compact-combobox-dropdown .compact-combobox-option > div > div > div {
	gap: 0.5rem;
}
</style>
