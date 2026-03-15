import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier/recommended'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

const browserExtensionGlobals = {
	// Standard browser globals
	window: 'readonly',
	document: 'readonly',
	navigator: 'readonly',
	console: 'readonly',
	URL: 'readonly',
	URLSearchParams: 'readonly',
	fetch: 'readonly',
	setTimeout: 'readonly',
	clearTimeout: 'readonly',
	setInterval: 'readonly',
	clearInterval: 'readonly',
	HTMLElement: 'readonly',
	HTMLInputElement: 'readonly',
	KeyboardEvent: 'readonly',
	ResizeObserver: 'readonly',
	MutationObserver: 'readonly',
	// WebExtension globals
	browser: 'readonly',
	chrome: 'readonly',
}

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...pluginVue.configs['flat/recommended'],
	prettierPlugin,
	prettierConfig,
	{
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		languageOptions: {
			globals: browserExtensionGlobals,
		},
		rules: {
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
		},
	},
	{
		files: ['**/*.vue'],
		languageOptions: {
			globals: browserExtensionGlobals,
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	{
		rules: {
			'vue/html-self-closing': 'off',
			'vue/multi-word-component-names': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	{
		ignores: ['.wxt/', '.output/', 'node_modules/'],
	},
)
