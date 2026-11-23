import { type App, createApp } from 'vue'

import ModrinthButton from '../../components/curseforge/ModrinthButton.vue'
import { installI18n } from '../../core/i18n/i18n'
import { installErrorReporting } from '../../core/telemetry'
import { injectStyles } from './styles'
import { EXTERNAL_UI_CLASS } from './ui-class'

const TARGETS = {
	sidebar: {
		selector: '.project-details-box .preview-actions-group > .project-download-wrapper',
		position: 'after',
	},
	floating: {
		selector: '.floating-header .preview-actions-group > .project-download-wrapper',
		position: 'before',
	},
} as const

type Placement = keyof typeof TARGETS

const mounted = new Map<Placement, { container: HTMLElement; app: App }>()
let style: HTMLStyleElement | null = null
let observer: MutationObserver | null = null
let projectUrl = ''

function unmountButton(placement: Placement) {
	const current = mounted.get(placement)
	if (!current) return
	current.app.unmount()
	current.container.remove()
	mounted.delete(placement)
}

export function hideModrinthButton() {
	observer?.disconnect()
	observer = null
	for (const placement of mounted.keys()) unmountButton(placement)
	style?.remove()
	style = null
}

function mountButton(placement: Placement) {
	if (mounted.get(placement)?.container.isConnected) return
	unmountButton(placement)
	const download = document.querySelector(TARGETS[placement].selector)
	if (!download) return

	const el = document.createElement('div')
	el.id = `modrinth-extras-curseforge-integration-${placement}`
	el.className = `project-download-wrapper ${EXTERNAL_UI_CLASS}`
	const splitButton = document.createElement('div')
	splitButton.className = 'split-button'
	el.appendChild(splitButton)

	const vueApp = createApp(ModrinthButton, { url: projectUrl })
	installErrorReporting(vueApp)
	installI18n(vueApp)
	if (TARGETS[placement].position === 'before') download.before(el)
	else download.after(el)
	vueApp.mount(splitButton)
	mounted.set(placement, { container: el, app: vueApp })
}

function mountButtons() {
	for (const placement of Object.keys(TARGETS) as Placement[]) mountButton(placement)
}

export function showModrinthButton(url: string) {
	hideModrinthButton()
	projectUrl = url
	style = injectStyles()
	observer = new MutationObserver(mountButtons)
	observer.observe(document.body, { childList: true, subtree: true })
	mountButtons()
}
