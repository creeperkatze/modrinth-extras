import { readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

// Chrome Web Store rejects extensions that load remote scripts. Catch that early.

const directory = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(directory, '../.output')

const SCRIPT_INJECTION = /createElement\(\s*(["'`])script\1\s*\)/g

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name)
		const stat = statSync(full)
		if (stat.isDirectory()) return walk(full)
		return full.endsWith('.js') ? [full] : []
	})
}

let files: string[]
try {
	files = walk(outDir)
} catch {
	console.error(`No build output found at ${outDir}.`)
	process.exit(1)
}

let violations = 0

for (const file of files) {
	const content = readFileSync(file, 'utf8')
	for (const match of content.matchAll(SCRIPT_INJECTION)) {
		violations++
		const start = Math.max(0, match.index - 60)
		const end = Math.min(content.length, match.index + 120)
		console.error(`${file.slice(outDir.length + 1)}:`)
		console.error(`  ...${content.slice(start, end).replace(/\s+/g, ' ')}...`)
	}
}

if (violations > 0) {
	console.error(
		`\nFound ${violations} dynamic <script> injection${violations === 1 ? '' : 's'} in the build output.`,
	)
	process.exit(1)
}

console.log(`Checked ${files.length} file(s), no remote script injection found.`)
