import { readdirSync, readFileSync } from 'node:fs'

// Chrome Web Store rejects extensions that load remote scripts
const SCRIPT_INJECTION = /createElement\(\s*(["'`])script\1\s*\)/g

const files = readdirSync('.output', { recursive: true, encoding: 'utf8' }).filter((file) =>
	file.endsWith('.js'),
)
let found = 0

for (const file of files) {
	const content = readFileSync(`.output/${file}`, 'utf8')
	for (const { index } of content.matchAll(SCRIPT_INJECTION)) {
		found++
		const context = content.slice(Math.max(0, index - 60), index + 120).replace(/\s+/g, ' ')
		console.error(`${file}: ...${context}...`)
	}
}

if (found) {
	console.error(`Found ${found} dynamic script injections in the build output.`)
	process.exit(1)
}
console.log(`Checked ${files.length} files, no remote script injection found.`)
