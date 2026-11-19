import type { WebNotification } from '@modrinth/ui'

type ToastOptions = Required<Pick<WebNotification, 'type' | 'title'>> &
	Pick<WebNotification, 'text'>

// Shown through the website's own toasts, which only the MAIN world bridge can reach.
// postMessage is used since Firefox strips CustomEvent details between the two worlds.
export function showNotification({ type, title, text }: ToastOptions) {
	window.postMessage(
		{ type: 'modrinth-extras:notify', notificationType: type, title, text },
		window.location.origin,
	)
}
