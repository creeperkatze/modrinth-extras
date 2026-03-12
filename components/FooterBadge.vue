<template>
	<p class="m-0">
		Modrinth Extra {{ version }}
	</p>
</template>

<script setup lang="ts">
const version = browser.runtime.getManifest().version
</script>
