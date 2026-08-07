<template>
	<button
		v-if="candidate"
		type="button"
		class="mb-2 inline-flex items-center gap-1.5 text-sm text-secondary hover:text-contrast hover:underline"
		:disabled="translating"
		@click="toggle"
	>
		<LoaderCircleIcon v-if="translating" aria-hidden="true" class="size-4 animate-spin" />
		<LanguagesIcon v-else aria-hidden="true" class="size-4" />
		{{ formatMessage(buttonLabel) }}
	</button>
</template>

<script setup lang="ts">
import { LanguagesIcon, LoaderCircleIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { i18n } from '../../utils/i18n'
import {
	createTranslator,
	detectTranslationCandidate,
	type TranslationCandidate,
} from '../../utils/translate-description'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	translate: { id: 'translateDescription.translate', defaultMessage: 'Translate description' },
	translating: { id: 'translateDescription.translating', defaultMessage: 'Translating…' },
	showOriginal: { id: 'translateDescription.showOriginal', defaultMessage: 'Show original' },
})

const props = defineProps<{ projectSlug: string }>()

const candidate = ref<TranslationCandidate | null>(null)
const translating = ref(false)
const translated = ref(false)
let originalHtml: string | null = null

const buttonLabel = computed(() =>
	translating.value
		? messages.translating
		: translated.value
			? messages.showOriginal
			: messages.translate,
)

function getMarkdownBody(): HTMLElement | null {
	return document.querySelector<HTMLElement>('.normal-page__content .markdown-body')
}

onMounted(async () => {
	const text = getMarkdownBody()?.textContent?.trim() ?? ''
	candidate.value = await detectTranslationCandidate(
		props.projectSlug,
		text,
		i18n.global.locale.value,
	)
})

function restoreOriginal() {
	const markdownBody = getMarkdownBody()
	if (markdownBody && originalHtml !== null) markdownBody.innerHTML = originalHtml
	translated.value = false
}

// Don't leave the page mid-translation if we navigate away while it's running.
onUnmounted(() => {
	if (translated.value) restoreOriginal()
})

async function toggle() {
	if (!candidate.value || translating.value) return

	if (translated.value) {
		restoreOriginal()
		return
	}

	const markdownBody = getMarkdownBody()
	if (!markdownBody) return

	translating.value = true
	try {
		const translator = await createTranslator(
			candidate.value.sourceLanguage,
			i18n.global.locale.value,
		)
		if (!translator) return

		try {
			const walker = document.createTreeWalker(markdownBody, NodeFilter.SHOW_TEXT, {
				acceptNode(node) {
					const trimmed = node.textContent?.trim()
					if (!trimmed) return NodeFilter.FILTER_REJECT
					// Punctuation-only nodes hallucinate garbage text when translated.
					if (!/\p{L}/u.test(trimmed)) return NodeFilter.FILTER_REJECT
					if (node.parentElement?.closest('code, pre')) return NodeFilter.FILTER_REJECT
					return NodeFilter.FILTER_ACCEPT
				},
			})

			const textNodes: Text[] = []
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				textNodes.push(node as Text)
			}

			// Translating mutates node.textContent, so snapshot before touching anything.
			originalHtml = markdownBody.innerHTML

			for (const node of textNodes) {
				const original = node.textContent ?? ''
				const leading = original.match(/^\s+/)?.[0] ?? ''
				const trailing = original.match(/\s+$/)?.[0] ?? ''

				const result = await translator.translate(original)
				const translatedText = result.trim() || original.trim()
				// Boundary whitespace matters next to inline elements like links.
				node.textContent = leading + translatedText + trailing
			}
			translated.value = true
		} finally {
			translator.destroy()
		}
	} catch (err) {
		console.error('[Modrinth Extras] Translate description: Failed to translate:', err)
	} finally {
		translating.value = false
	}
}
</script>
