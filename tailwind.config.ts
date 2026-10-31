import preset from '@modrinth/tooling-config/tailwind/tailwind-preset.ts'
import type { Config } from 'tailwindcss'

const config: Config = {
	content: ['./src/**/*.{js,vue,ts}', './node_modules/@modrinth/ui/src/**/*.{js,vue,ts}'],
	presets: [preset],
}

export default config
