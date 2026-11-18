<template>
	<div
		class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3"
	>
		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-semibold text-contrast">
				{{ formatMessage(messages['popup.creator.balance']) }}
			</span>
			<span
				class="bg-gradient-to-r from-brand-purple via-brand-orange via-20% to-brand-orange bg-clip-text text-2xl font-extrabold text-transparent"
			>
				{{ formatMoney(total) }}
			</span>
		</div>

		<div
			v-if="segments.length > 0"
			class="flex h-3 w-full gap-1.5 overflow-hidden rounded-full bg-bg-raised"
		>
			<div
				v-for="(segment, index) in segments"
				:key="segment.key"
				class="h-full hover:brightness-105"
				:style="{ width: segment.width }"
				@mouseenter="hoveredPart = segment.key"
				@mouseleave="hoveredPart = null"
			>
				<span
					class="block h-full w-full transition duration-150"
					:class="[
						segment.barClass,
						segment.key === 'available' ? 'gradient-border' : '',
						index === 0 ? 'rounded-l-full' : '',
						index === segments.length - 1 ? 'rounded-r-full' : '',
					]"
				/>
			</div>
		</div>

		<div class="flex flex-col">
			<div
				v-for="part in parts"
				:key="part.key"
				class="flex flex-row items-center justify-between border-0 border-b-2 border-solid border-divider p-1.5 last:border-b-0"
			>
				<span class="flex items-center gap-2 text-sm leading-none">
					<span class="block size-4 shrink-0 rounded-full" :class="part.dotClass" />
					{{ part.label }}
				</span>
				<span
					class="text-sm font-semibold text-contrast transition-colors"
					:class="hoveredPart === part.key ? part.hoverTextClass : ''"
				>
					{{ formatMoney(part.amount) }}
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
// A small version of the revenue page on Modrinth's website, with its bar and colors
import { defineMessages, useFormatMoney, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import { i18n } from '../../../../core/i18n/i18n'
import { type RevenueBalance, splitPendingRevenue } from '../../../../features/creator/revenue'

const props = defineProps<{
	balance: RevenueBalance
}>()

const { formatMessage } = useVIntl()
const formatMoney = useFormatMoney()

const messages = defineMessages({
	'popup.creator.balance': {
		id: 'popup.creator.balance',
		defaultMessage: 'Balance',
	},
	'popup.creator.availableNow': {
		id: 'popup.creator.availableNow',
		defaultMessage: 'Available now',
	},
	'popup.creator.estimated': {
		id: 'popup.creator.estimated',
		defaultMessage: 'Estimated {date}',
	},
	'popup.creator.processing': {
		id: 'popup.creator.processing',
		defaultMessage: 'Processing',
	},
})

const STRIPE_CLASSES = [
	'zone--striped--blue bg-gradient-to-b from-[#4E9CFF] to-[#4181D3]',
	'zone--striped--purple bg-gradient-to-b from-[#c084fc] to-[#a855f7]',
	'zone--striped--orange bg-gradient-to-b from-[#fb923c] to-[#f97316]',
	'zone--striped--red bg-gradient-to-b from-[#f87171] to-[#ef4444]',
]
const HIGHLIGHT_CLASSES = [
	'bg-highlight-blue',
	'bg-highlight-purple',
	'bg-highlight-orange',
	'bg-highlight-red',
]
const TEXT_CLASSES = ['!text-brand-blue', '!text-purple', '!text-orange', '!text-red']
const PROCESSING_CLASS = 'zone--striped--gray bg-button-bg'

const hoveredPart = ref<string | null>(null)

const total = computed(() => props.balance.available + props.balance.pending)
const pending = computed(() => splitPendingRevenue(props.balance))

interface RevenuePart {
	key: string
	amount: number
	barClass: string
	dotClass: string
	hoverTextClass: string
	label: string
}

function pick(classes: string[], index: number): string {
	return classes[index % classes.length] ?? ''
}

const parts = computed<RevenuePart[]>(() => {
	const dateFormatter = new Intl.DateTimeFormat(i18n.global.locale.value, {
		month: 'long',
		day: 'numeric',
	})
	return [
		{
			key: 'available',
			amount: props.balance.available,
			barClass: 'bg-gradient-to-b from-[#1CD96A] to-[#17B257]',
			dotClass: 'gradient-border bg-brand-green',
			hoverTextClass: '!text-green',
			label: formatMessage(messages['popup.creator.availableNow']),
		},
		...pending.value.estimated.map((payout, index) => {
			const stripe = `${pick(STRIPE_CLASSES, index)} ${pick(HIGHLIGHT_CLASSES, index)}`
			return {
				key: `estimated-${payout.date}`,
				amount: payout.amount,
				barClass: stripe,
				dotClass: `zone--striped-small ${stripe}`,
				hoverTextClass: pick(TEXT_CLASSES, index),
				label: formatMessage(messages['popup.creator.estimated'], {
					date: dateFormatter.format(new Date(payout.date)),
				}),
			}
		}),
		{
			key: 'processing',
			amount: pending.value.processing?.amount ?? 0,
			barClass: PROCESSING_CLASS,
			dotClass: `zone--striped-small ${PROCESSING_CLASS} opacity-90`,
			hoverTextClass: '!text-gray',
			label: formatMessage(messages['popup.creator.processing']),
		},
	]
})

// Widths add up to exactly 100%, and slivers under 1% are left out like on the website
const segments = computed(() => {
	if (total.value <= 0) return []
	const visible = parts.value
		.map((part) => ({
			key: part.key,
			barClass: part.barClass,
			percent: Math.round((part.amount / total.value) * 10000) / 100,
		}))
		.filter((part) => part.percent >= 1)
	const allButLast = visible.slice(0, -1).reduce((sum, part) => sum + part.percent, 0)
	return visible.map((part, index) => ({
		...part,
		width: `${index === visible.length - 1 ? Math.max(0, 100 - allButLast) : part.percent}%`,
	}))
})
</script>

<style scoped lang="scss">
// Copied from the revenue page on Modrinth's website
%zone--striped-common {
	background-attachment: scroll;
	background-position: 0 0;
	background-size: 9.38px 9.38px;
}

@mixin striped-background($color-variable) {
	background-image: linear-gradient(
		135deg,
		$color-variable 11.54%,
		transparent 11.54%,
		transparent 50%,
		$color-variable 50%,
		$color-variable 61.54%,
		transparent 61.54%,
		transparent 100%
	);
}

$striped-colors: 'green', 'blue', 'purple', 'orange', 'red';

@each $color in $striped-colors {
	.zone--striped--#{$color} {
		@include striped-background(var(--color-#{$color}));
		@extend %zone--striped-common;
	}
}

.zone--striped--gray {
	@extend %zone--striped-common;
	background-image: linear-gradient(
		135deg,
		var(--color-divider-dark) 11.54%,
		transparent 11.54%,
		transparent 50%,
		var(--color-divider-dark) 50%,
		var(--color-divider-dark) 61.54%,
		transparent 61.54%,
		transparent 100%
	);
}

.zone--striped-small {
	background-size: 6.19px 6.19px !important;
	background-position: unset !important;
	background-attachment: unset !important;
}

.gradient-border {
	position: relative;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent);
		border-radius: inherit;
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask-composite: xor;
		padding: 2px;
		pointer-events: none;
	}
}
</style>
