import type { Config } from 'tailwindcss'

import { EXTERNAL_UI_CLASS } from './src/features/curseforge-integration/ui-class'

// For UI injected into CurseForge, where Modrinth's CSS variables don't exist
const config: Config = {
	content: ['./src/components/curseforge/**/*.vue'],
	// Scoped so utilities never touch the host page, and specific enough to beat its rules
	important: `.${EXTERNAL_UI_CLASS}`,
	corePlugins: { preflight: false },
}

export default config
