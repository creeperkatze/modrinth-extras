<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div class="w-40">
			<DropdownSelect
				:options="allItems"
				:name="`field-${label}`"
				:model-value="selectedItem"
				:display-name="(item: SelectItem) => item.label"
				:disabled="loading"
				@update:model-value="(item: SelectItem) => $emit('update:modelValue', item.value)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { DropdownSelect } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

export interface SelectItem {
	label: string
	value: string
}

const ANY_ITEM: SelectItem = { label: 'Any', value: '' }

const props = defineProps<{
	label: string
	modelValue: string
	items?: SelectItem[]
	fetchItems?: () => Promise<SelectItem[]>
}>()

defineEmits<{
	'update:modelValue': [value: string]
}>()

const resolvedItems = ref<SelectItem[]>(props.items ?? [])
const loading = ref(false)

const allItems = computed<SelectItem[]>(() => [ANY_ITEM, ...resolvedItems.value])

const selectedItem = computed<SelectItem>(
	() => allItems.value.find((i) => i.value === props.modelValue) ?? ANY_ITEM,
)

onMounted(async () => {
	if (props.fetchItems) {
		loading.value = true
		try {
			resolvedItems.value = await props.fetchItems()
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

.option-field :deep(.animated-dropdown) {
	width: 100%;
	height: 2rem;
}

.option-field :deep(.selected) {
	padding: 0 var(--gap-md);
	font-size: var(--font-size-sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.option-field :deep(.option) {
	padding: var(--gap-sm) var(--gap-md);
	font-size: var(--font-size-sm);
}
</style>
