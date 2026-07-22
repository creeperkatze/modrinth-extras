<template>
	<hr class="w-full border-button-border my-0.5" />
	<a
		href="https://github.com/creeperkatze/modrinth-extras"
		target="_blank"
		rel="noopener"
		class="mt-2 flex items-center gap-1 no-underline hover:underline"
	>
		<ExtLogo aria-hidden="true" class="h-4 w-4 text-brand" />
		Modrinth Extras {{ version }}
	</a>
</template>

<script setup lang="ts">
import ExtLogo from '../../public/icon.svg?component'

const version = browser.runtime.getManifest().version
</script>
