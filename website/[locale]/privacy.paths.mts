import { localePaths, readMessages } from '../.vitepress/shared/config'

export default {
	paths: () => localePaths(readMessages(new URL('../src/locales', import.meta.url))),
}
