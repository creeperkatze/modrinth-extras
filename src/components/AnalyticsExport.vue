<template>
	<button
		v-tooltip="formatMessage(messages['analyticsExport.tooltip'])"
		class="btn icon-only color-accent-contrast"
		:disabled="exporting"
		@click="exportImage"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			viewBox="0 0 24 24"
		>
			<path
				d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"
			/>
			<circle cx="12" cy="13" r="3" />
		</svg>
	</button>
</template>

<script setup lang="ts">
import { defineMessages, useVIntl } from '@modrinth/ui'
import { ref } from 'vue'

const props = defineProps<{ buttonsContainer: HTMLElement }>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'analyticsExport.tooltip': {
		id: 'analyticsExport.tooltip',
		defaultMessage: 'Export as image',
	},
})

const exporting = ref(false)

function resolveCssVars(el: Element, style: CSSStyleDeclaration) {
	for (const attr of Array.from(el.attributes)) {
		if (attr.value.includes('var(')) {
			attr.value = attr.value.replace(
				/var\(--([^,)]+)(?:,[^)]+)?\)/g,
				(_, name: string) => style.getPropertyValue(`--${name.trim()}`).trim() || 'inherit',
			)
		}
	}
	const htmlEl = el as HTMLElement
	if (htmlEl.style?.length) {
		for (const prop of Array.from(htmlEl.style)) {
			const val = htmlEl.style.getPropertyValue(prop)
			if (val.includes('var(')) {
				htmlEl.style.setProperty(
					prop,
					val.replace(
						/var\(--([^,)]+)(?:,[^)]+)?\)/g,
						(_, name: string) => style.getPropertyValue(`--${name.trim()}`).trim() || '',
					),
				)
			}
		}
	}
	for (const child of Array.from(el.children)) resolveCssVars(child, style)
}

function prependTitle(
	clone: SVGSVGElement,
	bg: SVGRectElement,
	width: number,
	height: number,
	title: string,
	subtitle: string,
): number {
	if (!title) return 0

	const ns = 'http://www.w3.org/2000/svg'
	const TITLE_AREA = subtitle ? 52 : 36

	clone.setAttribute('height', String(height + TITLE_AREA))
	bg.setAttribute('height', String(height + TITLE_AREA))

	const wrapper = document.createElementNS(ns, 'g')
	wrapper.setAttribute('transform', `translate(0, ${TITLE_AREA})`)
	for (const child of Array.from(clone.childNodes)) {
		if (child !== bg) wrapper.appendChild(child)
	}
	clone.appendChild(wrapper)

	const titleEl = document.createElementNS(ns, 'text')
	titleEl.setAttribute('x', '16')
	titleEl.setAttribute('y', subtitle ? '20' : '22')
	titleEl.setAttribute('dominant-baseline', 'middle')
	titleEl.setAttribute('font-size', '15px')
	titleEl.setAttribute('font-weight', '600')
	titleEl.setAttribute(
		'font-family',
		'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
	)
	titleEl.setAttribute('fill', '#111111')
	titleEl.textContent = title
	clone.appendChild(titleEl)

	if (subtitle) {
		const subtitleEl = document.createElementNS(ns, 'text')
		subtitleEl.setAttribute('x', '16')
		subtitleEl.setAttribute('y', '38')
		subtitleEl.setAttribute('dominant-baseline', 'middle')
		subtitleEl.setAttribute('font-size', '12px')
		subtitleEl.setAttribute(
			'font-family',
			'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
		)
		subtitleEl.setAttribute('fill', '#666666')
		subtitleEl.textContent = subtitle
		clone.appendChild(subtitleEl)
	}

	return TITLE_AREA
}

function appendLegend(
	svgEl: SVGSVGElement,
	clone: SVGSVGElement,
	bg: SVGRectElement,
	width: number,
	height: number,
): number {
	const MARKER_R = 5
	const ITEM_GAP = 16
	const ROW_HEIGHT = 22

	const items = Array.from(svgEl.querySelectorAll('.apexcharts-series'))
		.map((el) => {
			const label = decodeURIComponent((el.getAttribute('seriesName') ?? '').replace(/\+/g, ' '))
			const color = el.querySelector('path.apexcharts-line')?.getAttribute('stroke') ?? ''
			return { label, color }
		})
		.filter((item) => item.label && item.color && item.color !== 'none')

	if (items.length <= 1) return height

	const measureCtx = document.createElement('canvas').getContext('2d')!
	measureCtx.font = '12px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
	const sized = items.map((item) => ({
		...item,
		itemWidth: MARKER_R * 2 + 6 + measureCtx.measureText(item.label).width,
	}))

	// Wrap items into rows
	const rows: (typeof sized)[] = []
	let row: typeof sized = []
	let rowWidth = 0
	for (const item of sized) {
		const needed = row.length === 0 ? item.itemWidth : item.itemWidth + ITEM_GAP
		if (rowWidth + needed > width - 24 && row.length > 0) {
			rows.push(row)
			row = [item]
			rowWidth = item.itemWidth
		} else {
			row.push(item)
			rowWidth += needed
		}
	}
	if (row.length) rows.push(row)

	const exportHeight = height + rows.length * ROW_HEIGHT + 8
	clone.setAttribute('height', String(exportHeight))
	bg.setAttribute('height', String(exportHeight))

	const ns = 'http://www.w3.org/2000/svg'
	const legendG = document.createElementNS(ns, 'g')
	for (let r = 0; r < rows.length; r++) {
		const rowItems = rows[r]
		const rowTotalWidth = rowItems.reduce(
			(sum, item, i) => sum + item.itemWidth + (i > 0 ? ITEM_GAP : 0),
			0,
		)
		let x = (width - rowTotalWidth) / 2
		const y = height + 6 + r * ROW_HEIGHT

		for (const item of rowItems) {
			const circle = document.createElementNS(ns, 'circle')
			circle.setAttribute('cx', String(x + MARKER_R))
			circle.setAttribute('cy', String(y + MARKER_R))
			circle.setAttribute('r', String(MARKER_R))
			circle.setAttribute('fill', item.color)
			legendG.appendChild(circle)

			const text = document.createElementNS(ns, 'text')
			text.setAttribute('x', String(x + MARKER_R * 2 + 6))
			text.setAttribute('y', String(y + MARKER_R * 2 - 1))
			text.setAttribute('font-size', '12px')
			text.setAttribute(
				'font-family',
				'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
			)
			text.setAttribute('fill', '#333333')
			text.textContent = item.label
			legendG.appendChild(text)

			x += item.itemWidth + ITEM_GAP
		}
	}
	clone.appendChild(legendG)
	return exportHeight
}

async function exportImage() {
	if (exporting.value) return
	exporting.value = true

	try {
		const card = props.buttonsContainer.closest('.universal-card')
		const svgEl = card?.querySelector<SVGSVGElement>('.apexcharts-svg')
		if (!svgEl) {
			console.error('[Modrinth Extras] Chart export: no chart SVG found in card')
			return
		}

		const width = svgEl.width.baseVal.value || 857
		const height = svgEl.height.baseVal.value || 532

		const clone = svgEl.cloneNode(true) as SVGSVGElement
		for (const el of Array.from(
			clone.querySelectorAll('foreignObject, .apexcharts-xcrosshairs, .apexcharts-ycrosshairs'),
		))
			el.remove()

		const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		bg.setAttribute('width', String(width))
		bg.setAttribute('height', String(height))
		bg.setAttribute('fill', '#ffffff')
		clone.insertBefore(bg, clone.firstChild)

		resolveCssVars(clone, getComputedStyle(document.documentElement))

		const title = card?.querySelector('.label__title')?.textContent?.trim() ?? ''
		const subtitle = card?.querySelector('.label__subtitle')?.textContent?.trim() ?? ''
		const titleOffset = prependTitle(clone, bg, width, height, title, subtitle)
		const exportHeight = appendLegend(svgEl, clone, bg, width, height + titleOffset)

		const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
			type: 'image/svg+xml;charset=utf-8',
		})
		const url = URL.createObjectURL(blob)
		try {
			const img = new Image()
			img.src = url
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve()
				img.onerror = () => reject(new Error('SVG load failed'))
			})

			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = exportHeight
			const ctx = canvas.getContext('2d')!
			ctx.fillStyle = '#ffffff'
			ctx.fillRect(0, 0, width, exportHeight)
			ctx.drawImage(img, 0, 0)

			const a = document.createElement('a')
			a.href = canvas.toDataURL('image/png')
			a.download = `${(title || 'chart').toLowerCase().replace(/\s+/g, '-')}.png`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
		} finally {
			URL.revokeObjectURL(url)
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to export chart as image:', err)
	} finally {
		exporting.value = false
	}
}
</script>
