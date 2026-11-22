export function slugify(text: string, fallback: string): string {
	const slug = text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return slug || fallback
}

export function baseLanguage(tag: string): string {
	return tag.split('-')[0]!.toLowerCase()
}
