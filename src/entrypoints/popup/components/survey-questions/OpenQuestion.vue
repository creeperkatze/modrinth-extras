<template>
	<StyledInput
		v-model="response"
		multiline
		:rows="3"
		resize="vertical"
		class="mt-2 w-full"
		input-class="!text-sm !border !border-solid !border-surface-5"
		:placeholder="placeholder"
	/>
	<div class="mt-2 flex justify-end">
		<ButtonStyled color="brand" size="small">
			<button type="button" :disabled="!response.trim()" @click="submit">
				{{ submitText }}
			</button>
		</ButtonStyled>
	</div>
</template>

<script setup lang="ts">
import { ButtonStyled, StyledInput } from '@modrinth/ui'
import { ref } from 'vue'

defineProps<{
	placeholder: string
	submitText: string
}>()

const emit = defineEmits<{
	submit: [value: string]
}>()

const response = ref('')

function submit() {
	const trimmed = response.value.trim()
	if (!trimmed) return
	emit('submit', trimmed)
}
</script>
