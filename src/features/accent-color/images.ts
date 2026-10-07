import { type Colord, colord } from 'colord'

type Rect = [number, number, number, number]

interface BrandImage {
	match: string
	// Normalized area to leave alone, like a green server icon
	exclude?: Rect
	// Wider hue window for images that use a green to teal gradient
	hue?: { center: number; range: number }
}

const BRAND_IMAGES: BrandImage[] = [
	{ match: '/hosting-landing/hosting-panel.', exclude: [0, 0, 0.12, 0.16] },
	{ match: '/hosting-landing/hosting-content.', exclude: [0.08, 0.05, 0.14, 0.13] },
	{ match: '/servers/bigrinth.' },
	{ match: '/app-landing/home-2026.' },
	{ match: '/app-landing/instance-2026.' },
	{ match: '/app-landing/mr-app-icon.', hue: { center: 150, range: 30 } },
]

const SELECTOR = [
	...BRAND_IMAGES.map((image) => `img[src*="${image.match}"]`),
	'img[data-modrinth-extras-src]',
].join(', ')

// Centered between the real brand green and the slightly shifted one in the screenshots
const GREEN_HUE = 138
const FULL_HUE_RANGE = 12
const FADE_HUE_RANGE = 12
const BRAND = colord('#1bd96a').toHsv()

let accent: string | null = null
let pendingAccent: ReturnType<typeof setTimeout> | undefined
const sources = new Map<string, Promise<ImageData>>()
const results = new Map<string, { color: string; url: Promise<string> }>()

function loadSource(src: string) {
	let source = sources.get(src)
	if (!source) {
		source = new Promise<ImageData>((resolve, reject) => {
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				const canvas = document.createElement('canvas')
				canvas.width = img.naturalWidth
				canvas.height = img.naturalHeight
				const ctx = canvas.getContext('2d')!
				ctx.drawImage(img, 0, 0)
				resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
			}
			img.onerror = reject
			img.src = src
		})
		source.catch(() => sources.delete(src))
		sources.set(src, source)
	}
	return source
}

function recolor(source: ImageData, color: Colord, image: BrandImage) {
	const exclude = image.exclude ?? [0, 0, 0, 0]
	const { center, range } = image.hue ?? { center: GREEN_HUE, range: FULL_HUE_RANGE }
	const { width, height } = source
	const data = new Uint8ClampedArray(source.data)
	const target = color.toHsv()
	const sScale = target.s / BRAND.s
	const vScale = target.v / BRAND.v
	const [exLeft, exTop, exRight, exBottom] = [
		exclude[0] * width,
		exclude[1] * height,
		exclude[2] * width,
		exclude[3] * height,
	]

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i]!
		const g = data[i + 1]!
		const b = data[i + 2]!
		if (g <= r || g <= b) continue

		const { h, s, v } = colord({ r, g, b }).toHsv()
		const hueWeight = (range + FADE_HUE_RANGE - Math.abs(h - center)) / FADE_HUE_RANGE
		const weight = Math.min(1, hueWeight) * Math.min(1, (s - 10) / 15)
		if (weight <= 0) continue

		const x = (i / 4) % width
		const y = Math.floor(i / 4 / width)
		if (x >= exLeft && x < exRight && y >= exTop && y < exBottom) continue

		const next = colord({
			h: target.h,
			s: Math.min(100, s * sScale),
			v: Math.min(100, v * vScale),
		}).toRgb()
		data[i] = r + (next.r - r) * weight
		data[i + 1] = g + (next.g - g) * weight
		data[i + 2] = b + (next.b - b) * weight
	}

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	canvas.getContext('2d')!.putImageData(new ImageData(data, width, height), 0, 0)
	return canvas.toDataURL('image/webp', 0.92)
}

function recoloredUrl(src: string, image: BrandImage, color: string) {
	const cached = results.get(src)
	if (cached?.color === color) return cached.url
	const url = loadSource(src).then((source) => recolor(source, colord(color), image))
	results.set(src, { color, url })
	return url
}

function restore(img: HTMLImageElement) {
	const original = img.dataset.modrinthExtrasSrc
	delete img.dataset.modrinthExtrasAccent
	if (!original) return
	delete img.dataset.modrinthExtrasSrc
	img.src = original
}

export function recolorBrandImages() {
	for (const img of document.querySelectorAll<HTMLImageElement>(SELECTOR)) {
		const original = img.dataset.modrinthExtrasSrc ?? img.src
		const image = BRAND_IMAGES.find((candidate) => original.includes(candidate.match))
		if (!image) continue

		if (!accent) {
			restore(img)
			continue
		}

		const color = accent
		if (img.dataset.modrinthExtrasAccent === color) continue
		img.dataset.modrinthExtrasAccent = color
		recoloredUrl(original, image, color)
			.then((url) => {
				if (img.dataset.modrinthExtrasAccent !== color) return
				img.dataset.modrinthExtrasSrc = original
				img.src = url
			})
			.catch((err) => console.error('[Modrinth Extras] Failed to recolor image:', err))
	}
}

// Recoloring is slow, so wait until the color stops changing, like while dragging the picker
export function setImageAccent(color: string | null) {
	clearTimeout(pendingAccent)
	pendingAccent = setTimeout(() => {
		accent = color
		recolorBrandImages()
	}, 250)
}
