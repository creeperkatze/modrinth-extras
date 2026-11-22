import { reactive } from 'vue'

import { DEFAULTS, type ExtensionSettings, getSettings, watchSettings } from './settings'

// One copy per context, so components follow changes without being remounted
const store = reactive(structuredClone(DEFAULTS)) as ExtensionSettings

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value != null && typeof value === 'object' && !Array.isArray(value)
}

// Only changed values are written, so nothing watching an untouched setting reruns
export function assignChanged(target: object, source: object) {
	const into = target as Record<string, unknown>
	for (const [key, value] of Object.entries(source)) {
		const current = into[key]
		if (isPlainObject(current) && isPlainObject(value)) assignChanged(current, value)
		else if (JSON.stringify(current) !== JSON.stringify(value)) into[key] = structuredClone(value)
	}
}

export function useSettings(): ExtensionSettings {
	return store
}

export async function loadSettingsStore(): Promise<ExtensionSettings> {
	assignChanged(store, await getSettings())
	return store
}

export function followSettingsChanges(onChange: () => void): () => void {
	return watchSettings((settings) => {
		assignChanged(store, settings)
		onChange()
	})
}
