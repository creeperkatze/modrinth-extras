import { readFileSync, writeFileSync } from 'node:fs'

import { showcase } from '../website/src/showcase.ts'

const BLOCK = /<!-- features:start -->[\s\S]*?<!-- features:end -->/
const highlights = JSON.parse(readFileSync('website/src/locales/en-US.json', 'utf8')).meta.feature

const escapeHtml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rows = showcase.map(({ key, image }, index) => {
	const title = escapeHtml(highlights[key].title)
	const description = escapeHtml(highlights[key].description).replace(
		/`([^`]+)`/g,
		'<code>$1</code>',
	)
	const cells = [
		`<td width="50%"><img src="website/public/screenshots/${image}"></td>`,
		`<td width="50%"><h3>${title}</h3>${description}</td>`,
	]
	// Alternates the image between the left and right column
	if (index % 2) cells.reverse()
	return `<tr>\n${cells.join('\n')}\n</tr>`
})

const table = `<table>\n${rows.join('\n')}\n</table>`
const readme = readFileSync('README.md', 'utf8')
const updated = readme.replace(BLOCK, `<!-- features:start -->\n${table}\n<!-- features:end -->`)

if (process.argv.includes('--check')) {
	if (updated !== readme) {
		console.error('README features are out of date. Run `node scripts/readme-features.ts`.')
		process.exit(1)
	}
} else {
	writeFileSync('README.md', updated)
}
