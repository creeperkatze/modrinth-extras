# Modrinth Extras

Browser extension that enhances the Modrinth website with extra features. Built with WXT, Vue 3, TypeScript, and Tailwind CSS.

## Commands

```bash
pnpm build # Build for Chrome/Edge
pnpm build:firefox # Build for Firefox
pnpm zip # Packaged zip for Chrome/Edge
pnpm zip:firefox # Packaged zip for Firefox
pnpm lint # Lint
pnpm lint:fix # Lint and auto-fix fixable issues
```

No automated tests; testing is manual in the browser.

## Locales

**Never edit locale JSON files by hand.** They are generated from `defineMessages` calls in source files.

After adding or changing any `defineMessages` entry, regenerate:

```bash
pnpm intl:extract
```

UI strings use Vue I18n via `@modrinth/ui`'s `defineMessages` + `useVIntl`. Other languages are managed via Crowdin.

## Architecture

- `src/entrypoints/background.ts`: service worker (badge, system notifications, polling)
- `src/entrypoints/content.ts`: main content script (ISOLATED world) — mounts all Vue components
- `src/entrypoints/modrinth-bridge.content.ts`: MAIN world bridge — hooks Nuxt router for SPA navigation
- `src/entrypoints/curseforge-bridge.content.ts`: patches `history.pushState`/`replaceState` on curseforge.com for SPA navigation
- `src/entrypoints/popup/`: extension settings popup
- `src/components/`: Vue components injected into Modrinth pages
- `src/utils/`: shared utilities (apiFetch, settings, notifications, etc.)
- `src/background/`: code used only by the service worker
- `src/locales/`: i18n translation files

### Dual content script worlds

`content.ts` (ISOLATED world) cannot access page JS; it mounts Vue components, handles settings, and listens for browser messages. `modrinth-bridge.content.ts` (MAIN world) runs in page context and hooks the Nuxt router — dispatches `modrinth-extras:router-ready` after Nuxt suspense resolves, and `beforeEach`/`afterEach` navigation CustomEvents. Finds the router via `window.__nuxt_app.$router` or `#__nuxt.__vue_app__`.

### Injection helpers

- `createInjection`: single instance per page (e.g. notifications indicator). Handles mount/unmount across SPA navigations.
- `createDynamicInjection`: multiple instances targeting specific DOM elements (e.g. project card buttons). Uses MutationObserver for dynamic content.

## Key conventions

- **API calls**: use `apiFetch` from `utils/api.ts`; auth token is read from the `auth-token` cookie automatically. Pass `{ apiVersion: 3 }` for v3 endpoints.
- **Settings**: read via `getSettings()`; never read directly from storage in components.
- **Style**: Prettier — tabs, single quotes, no semicolons, trailing commas, 100-char lines, LF line endings.
- **Logging**: prefix all messages with `[Modrinth Extras]`; add a subsystem sub-prefix where relevant (e.g. `[Modrinth Extras] Badge:`). Use `console.error` for problems — always pass the error value as the last argument (`console.error('... Failed to fetch:', err)`). Use `console.log` for informational messages in past tense ("Loaded", "Injected"). No `console.warn`.

## Modrinth packages

`@modrinth/ui`, `@modrinth/assets`, `@modrinth/utils`, and `@modrinth/api-client` come from the **`modrinth/`** git submodule (the [modrinth/code](https://github.com/modrinth/code) monorepo), consumed as local workspace packages.

When investigating components, icons, or types, read the source directly:

- Components: `modrinth/packages/ui/src/`
- Icons: `modrinth/packages/assets/`
- Types: `modrinth/packages/utils/`

Don't rely on memory for props, exports, or type names — they shift between submodule versions. **Never import directly from the `modrinth/` path**; always use the package name:

```ts
import { ButtonStyled } from '@modrinth/ui'
import { BellIcon } from '@modrinth/assets'
```
