<template>
	<button
		v-tooltip="formatMessage(messages['analyticsExporter.tooltip'])"
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
	'analyticsExporter.tooltip': {
		id: 'analyticsExporter.tooltip',
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

		const pageStyle = getComputedStyle(document.documentElement)
		const clone = svgEl.cloneNode(true) as SVGSVGElement

		// foreignObject with embedded <style> taints the canvas in most browsers
		for (const fo of Array.from(clone.querySelectorAll('foreignObject'))) fo.remove()

		// White background so the PNG isn't transparent
		const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		bg.setAttribute('width', String(width))
		bg.setAttribute('height', String(height))
		bg.setAttribute('fill', '#ffffff')
		clone.insertBefore(bg, clone.firstChild)

		resolveCssVars(clone, pageStyle)

		const svgStr = new XMLSerializer().serializeToString(clone)
		const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
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
			canvas.height = height
			const ctx = canvas.getContext('2d')!
			ctx.fillStyle = '#ffffff'
			ctx.fillRect(0, 0, width, height)
			ctx.drawImage(img, 0, 0)

			const title = card?.querySelector('.label__title')?.textContent?.trim() ?? 'chart'
			const a = document.createElement('a')
			a.href = canvas.toDataURL('image/png')
			a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`
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
