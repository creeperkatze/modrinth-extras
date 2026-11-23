import preset from '@modrinth/tooling-config/tailwind/tailwind-preset.ts'
import type { Config } from 'tailwindcss'

const config: Config = {
	content: [
		'./src/**/*.{js,vue,ts}',
		// Built separately by tailwind.external.config.ts
		'!./src/components/curseforge/**',
		'./node_modules/@modrinth/ui/src/**/*.{js,vue,ts}',
	],
	presets: [preset],
}

export default config
