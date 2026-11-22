import { showcase } from '../../src/showcase'
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
	showcase: showcase.map(({ key, image }) => ({ key, image: `/screenshots/${image}` })),
})
