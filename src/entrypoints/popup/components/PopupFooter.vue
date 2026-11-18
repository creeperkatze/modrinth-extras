<template>
	<div class="flex shrink-0 items-center gap-2 px-3 py-1.5">
		<div class="flex min-w-0 flex-1 items-center gap-2">
			<span class="shrink-0 text-xs text-secondary">v{{ version }}</span>
			<span v-if="checking" class="flex min-w-0 items-center gap-1 text-xs text-muted">
				<LoaderCircleIcon class="!size-3.5 shrink-0 animate-spin" aria-hidden="true" />
				<span class="truncate">{{ formatMessage(messages['popup.footer.checking']) }}</span>
			</span>
			<a
				v-else-if="isLatest"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex min-w-0 items-center gap-1 text-xs text-green-500 no-underline transition-colors hover:text-green-400"
			>
				<CheckCircleIcon class="!size-3.5 shrink-0" aria-hidden="true" />
				<span class="truncate">{{ formatMessage(messages['popup.footer.latestVersion']) }}</span>
			</a>
			<a
				v-else-if="latestVersion"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex min-w-0 items-center gap-1 text-xs text-yellow no-underline transition-[filter] hover:brightness-125"
			>
				<ClockIcon class="!size-3.5 shrink-0" aria-hidden="true" />
				<span class="truncate">{{ formatMessage(messages['popup.footer.updateAvailable']) }}</span>
			</a>
		</div>
		<a
			href="https://ko-fi.com/creeperkatze"
			target="_blank"
			rel="noopener"
			class="flex shrink-0 items-center gap-1 text-xs text-[#FF5E5B] no-underline transition-colors hover:text-[#ff8e8c]"
		>
			<KofiIcon class="!size-3.5" aria-hidden="true" />
			{{ formatMessage(messages['popup.footer.donate']) }}
		</a>
		<a
			href="https://github.com/creeperkatze/modrinth-extras"
			target="_blank"
			rel="noopener"
			class="flex shrink-0 items-center gap-1 text-xs text-yellow no-underline transition-[filter] hover:brightness-125"
		>
			<Star class="!size-3.5 shrink-0" aria-hidden="true" />
			<span>{{ formatMessage(messages['popup.footer.starOnGitHub']) }}</span>
		</a>
	</div>
</template>

<script setup lang="ts">
import { Star } from '@lucide/vue'
import { CheckCircleIcon, ClockIcon, LoaderCircleIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { storage } from '@wxt-dev/storage'
import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import KofiIcon from '../../../assets/icons/kofi.svg?component'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.footer.checking': { id: 'popup.footer.checking', defaultMessage: 'Checking' },
	'popup.footer.latestVersion': {
		id: 'popup.footer.latestVersion',
		defaultMessage: 'Latest version',
	},
	'popup.footer.updateAvailable': {
		id: 'popup.footer.updateAvailable',
		defaultMessage: 'Update available',
	},
	'popup.footer.starOnGitHub': { id: 'popup.footer.starOnGitHub', defaultMessage: 'On GitHub' },
	'popup.footer.donate': { id: 'popup.footer.donate', defaultMessage: 'Donate' },
})

const version = browser.runtime.getManifest().version
const latestVersion = ref<string | null>(null)
const isLatest = ref(false)
const checking = ref(true)

const updateCheckCacheItem = storage.defineItem<{ tag: string; ts: number }>(
	'local:updateCheckCache',
)

onMounted(async () => {
	try {
		const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

		const entry = await updateCheckCacheItem.getValue()
		let tag: string

		if (entry && Date.now() - entry.ts < CACHE_TTL) {
			tag = entry.tag
		} else {
			const res = await fetch(
				'https://api.github.com/repos/creeperkatze/modrinth-extras/releases/latest',
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			tag = data.tag_name?.replace(/^v/, '') ?? ''
			await updateCheckCacheItem.setValue({ tag, ts: Date.now() })
		}

		if (tag && tag !== version) latestVersion.value = tag
		else if (tag) isLatest.value = true
	} catch (err) {
		console.error('[Modrinth Extras] Failed to check for updates:', err)
	} finally {
		checking.value = false
	}
})
</script>
