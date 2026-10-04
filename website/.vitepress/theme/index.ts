/* eslint-disable simple-import-sort/imports */

import { browserStoreStats, createTheme, messagesFromGlob } from '../shared/theme'

import Logo from './icons/logo.svg?skipsvgo'
// Must come after the theme so the brand colors win
import './custom.css'

export default createTheme({
	messages: messagesFromGlob(
		import.meta.glob('../../src/locales/*.json', { eager: true, import: 'default' }),
	),
	logo: Logo,
	stats: browserStoreStats({
		chrome: 'ajmkilipadfpaefpcjfgnkejalmhdlcj',
		firefox: 'modrinth-extras',
		edge: 'jkfgnimibfpoohbmaibjdjdmfnjmbjcj',
	}),
	showcase: [
		{ key: 'popup', image: '/screenshots/extension.png' },
		{ key: 'cardActions', image: '/screenshots/project-card-actions.png' },
		{ key: 'galleryBackground', image: '/screenshots/gallery-background.png' },
		{ key: 'notifications', image: '/screenshots/notifications.png' },
		{ key: 'dependencyExplorer', image: '/screenshots/dependency-explorer.png' },
		{ key: 'quickSearch', image: '/screenshots/quicksearch.png' },
		{ key: 'sparkline', image: '/screenshots/sparkline.png' },
		{ key: 'sidebar', image: '/screenshots/sidebar.png' },
	],
})
