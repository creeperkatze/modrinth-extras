<template>
	<button
		type="button"
		class="preview-radio button-base h-full"
		:class="{ selected }"
		:aria-pressed="selected"
		@click="$emit('select')"
	>
		<div
			class="preview"
			:class="[`${base}-mode`, THEME_PREVIEW_CLASS]"
			:[THEME_ATTRIBUTE]="id"
			aria-hidden="true"
		>
			<div class="example-card rounded-lg border border-solid border-surface-4 bg-surface-3">
				<div class="example-icon"></div>
				<div class="example-text-1"></div>
				<div class="example-text-2"></div>
			</div>
		</div>
		<div class="label" :class="{ '!pr-20': hasActions }">
			<RadioButtonCheckedIcon v-if="selected" class="radio shrink-0" aria-hidden="true" />
			<RadioButtonIcon v-else class="radio shrink-0" aria-hidden="true" />
			<span class="min-w-0 truncate">{{ name }}</span>
		</div>
	</button>
</template>

<script setup lang="ts">
import { RadioButtonCheckedIcon, RadioButtonIcon } from '@modrinth/assets'

import type { ThemeColors } from '../../core/settings'
import { THEME_ATTRIBUTE, THEME_PREVIEW_CLASS } from '../../features/themes/themes'

defineProps<{
	id: string
	name: string
	base: ThemeColors['base']
	selected: boolean
	// Leaves room for buttons placed over the label, which can't sit inside this button
	hasActions?: boolean
}>()

defineEmits<{
	select: []
}>()
</script>

<style scoped lang="scss">
// The preview card from the website's theme selector, whose styles are scoped to it
.preview .example-card {
	margin: 0;
	padding: 1rem;
	display: grid;
	grid-template: 'icon text1' 'icon text2';
	grid-template-columns: auto 1fr;
	gap: 0.5rem;
	outline: 2px solid transparent;

	.example-icon {
		grid-area: icon;
		width: 2rem;
		height: 2rem;
		background-color: var(--color-button-bg);
		border-radius: var(--radius-sm);
		outline: 2px solid transparent;
	}

	.example-text-1,
	.example-text-2 {
		height: 0.5rem;
		border-radius: var(--radius-sm);
		outline: 2px solid transparent;
	}

	.example-text-1 {
		grid-area: text1;
		width: 100%;
		background-color: var(--color-base);
	}

	.example-text-2 {
		grid-area: text2;
		width: 60%;
		background-color: var(--color-secondary);
	}
}
</style>
