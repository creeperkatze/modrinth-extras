import { spawnSync } from 'node:child_process'

// Modrinth's packages don't pass our stricter settings, so only errors in our own files count
const { stdout, stderr } = spawnSync('vue-tsc --noEmit --pretty false', {
	encoding: 'utf8',
	shell: true,
})
const errors = `${stdout}${stderr}`
	.split(/\r?\n(?=\S)/)
	.filter((error) => error.trim() && !error.startsWith('modrinth/'))

if (errors.length) {
	console.error(errors.join('\n'))
	process.exit(1)
}
