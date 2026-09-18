import { spawn } from 'child_process'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const [scriptName, ...args] = process.argv.slice(2)

if (!scriptName) {
	console.error('Usage: pnpm scripts <script-name> [args...]')
	process.exit(1)
}

const scriptPath = join(__dirname, `${scriptName}.ts`)
const tsxPackage = require('tsx/package.json')
const tsxCli = join(dirname(require.resolve('tsx/package.json')), tsxPackage.bin)

const child = spawn(process.execPath, [tsxCli, scriptPath, ...args], {
	stdio: 'inherit',
})

child.on('exit', (code) => {
	process.exit(code ?? 0)
})
