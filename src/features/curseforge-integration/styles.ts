import styles from '../../assets/external-tailwind.css?inline'

export function injectStyles(): HTMLStyleElement {
	const style = document.createElement('style')
	style.textContent = styles
	document.head.appendChild(style)
	return style
}
