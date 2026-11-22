import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { showcase } from '../website/src/showcase'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readmePath = resolve(root, 'README.md')
const check = process.argv.includes('--check')

const START = '<!-- features:start -->'
const END = '<!-- features:end -->'

type Highlight = { title: string; description: string }
const messages = JSON.parse(readFileSync(resolve(root, 'website/src/locales/en-US.json'), 'utf8'))
const highlights: Record<string, Highlight> = messages.meta.feature

const escapeHtml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rows = showcase.map(({ key, image }, index) => {
	const highlight = highlights[key]
	if (!highlight) throw new Error(`Missing en-US highlight text for "${key}".`)
	const description = escapeHtml(highlight.description).replace(/`([^`]+)`/g, '<code>$1</code>')
	const text = `<td width="50%"><h3>${escapeHtml(highlight.title)}</h3>${description}</td>`
	const picture = `<td width="50%"><img src="website/public/screenshots/${image}"></td>`
	return `<tr>\n${index % 2 === 0 ? picture : text}\n${index % 2 === 0 ? text : picture}\n</tr>`
})

const block = `${START}\n<table>\n${rows.join('\n')}\n</table>\n${END}`

const readme = readFileSync(readmePath, 'utf8')
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`)
if (!pattern.test(readme)) throw new Error(`README.md has no ${START} ... ${END} block.`)
const updated = readme.replace(pattern, block)

if (check) {
	if (updated !== readme) {
		console.error('README features are out of date. Run `pnpm scripts readme-features`.')
		process.exit(1)
	}
} else if (updated !== readme) {
	writeFileSync(readmePath, updated)
	console.log('Updated README features.')
} else {
	console.log('README features are already up to date.')
}
