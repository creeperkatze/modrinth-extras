# Modrinth Extras

Browser extension that enhances the Modrinth website with extra features. Built with WXT, Vue 3, TypeScript, and Tailwind CSS. Not officially affiliated with Modrinth.

## Commands

```bash
pnpm dev              # Chrome dev mode (watch)
pnpm dev:firefox      # Firefox dev mode (watch)
pnpm build            # Production build (Chrome)
pnpm build:firefox    # Production build (Firefox)
pnpm lint             # Check linting
pnpm lint:fix         # Auto-fix linting issues
pnpm intl:extract     # Extract i18n messages from source
```

No automated tests, testing is manual in the browser.

## Project Structure

```
src/
  entrypoints/        # Extension entry points
    background.ts     # Service worker (badge, desktop notifications, polling)
    content.ts        # Main content script (ISOLATED world) — mounts all Vue components
    modrinth-bridge.content.ts  # MAIN world bridge — hooks Nuxt router for SPA navigation
    popup/            # Extension settings popup
  components/         # Vue components injected into Modrinth pages
  helpers/            # Shared utilities (apiFetch, settings, notifications, etc.)
  background/         # Code used only by the service worker
  locales/            # i18n translation files
```

## Architecture

### Dual Content Script Worlds

- **ISOLATED world** (`content.ts`): Cannot access page JS. Mounts Vue components, handles settings, listens for browser messages.
- **MAIN world** (`modrinth-bridge.content.ts`): Runs in page context, hooks into Nuxt router. Dispatches `modrinth-extras:router-ready` after Nuxt suspense resolves (not just hydration — suspense fires after async data loads too). Hooks `beforeEach`/`afterEach` to dispatch navigation CustomEvents. Handles `modrinth-extras:navigate` postMessages to call `router.push()`. Finds the router via `window.__nuxt_app.$router` or `#__nuxt.__vue_app__` (the latter is observable via MutationObserver, the former is not).

**CurseForge** (`curseforge-bridge.content.ts`) is unrelated to the above — it runs on `curseforge.com`, not Modrinth. It patches `history.pushState`/`replaceState` at `document_start` (MAIN world) so it runs before React Router caches the original reference. Dispatches `modrinth-extras:cf-navigated` on navigation.

### Injection System

- `createInjection`: single instance per page (e.g. notifications indicator, quick search). Handles mount/unmount lifecycle across SPA navigations.
- `createDynamicInjection`: multiple instances targeting specific DOM elements (e.g. project card action buttons). Uses MutationObserver for dynamic content.

### Notifications Flow

1. Background polls every 5 minutes via alarms
2. `NotificationsIndicator.vue` fetches on mount and every 60 seconds
3. Optimistic updates: mutate `notificationsData.value` in place → Vue re-renders immediately → fire-and-forget API PATCH
4. `syncToBackground` is only called after a real fetch (in `refreshNotifications`), not after optimistic updates

### Logging

All log messages must be prefixed with `[Modrinth Extras]`. Use a sub-prefix for context when the message comes from a specific subsystem.

```ts
// General errors: "Failed to <verb> <subject>:"
console.error('[Modrinth Extras] Failed to fetch notifications:', err)
console.error('[Modrinth Extras] Failed to load saved locale:', err)
console.error(`[Modrinth Extras] Failed to fetch project ID for ${slug}:`, err)

// Subsystem errors: "[Modrinth Extras] <Subsystem>: <message>"
console.error('[Modrinth Extras] Badge: Background update failed:', err)
console.error(`[Modrinth Extras] CurseForge redirect: API request failed for "${path}":`, err)

// Info logs: describe what happened, not what will happen
console.log('[Modrinth Extras] Content script loaded')
console.log(`[Modrinth Extras] Injected ${config.id}`)
console.log('[Modrinth Extras] Badge: No auth token, clearing badge')
console.log('[Modrinth Extras] Settings loaded:', JSON.stringify(s))
```

Rules:
- Errors always end with `: err` (the error value as the last argument, not stringified)
- Info logs use past tense ("Loaded", "Injected", "Detached") not future ("Loading", "Injecting")
- No `console.warn` for errors, use `console.error` for problems, `console.log` for informational

### Style
Prettier config: tabs, single quotes, no semicolons, trailing commas, 100-char lines, LF line endings.

### API Calls
Use `apiFetch` from `helpers/apiFetch.ts`. Auth token is read from the `auth-token` cookie automatically. API v2 is default; pass `{ apiVersion: 3 }` for v3 endpoints.

### Settings
Read via `getSettings()`. Settings are deeply merged and cached. Components re-inject when relevant settings keys change (declared in injection config). Never read settings directly from storage in components.

## i18n

UI strings use Vue I18n via `@modrinth/ui`'s `defineMessages` + `useVIntl`. Run `pnpm intl:extract` after adding or changing message IDs. Translation files live in `src/locales/`.

## Modrinth Packages

`@modrinth/ui`, `@modrinth/assets`, `@modrinth/utils`, and `@modrinth/api-client` come from the **`modrinth/`** git submodule, which points to the [modrinth/code](https://github.com/modrinth/code) monorepo. They are consumed as local workspace packages via `pnpm-workspace.yaml`.

When investigating components, icons, or types, read the source directly from `modrinth/` at the project root:

- Components: `modrinth/packages/ui/src/`
- Icons: `modrinth/packages/assets/`
- Types: `modrinth/packages/utils/`

Don't rely on memory for props, exports, or type names, they shift between submodule versions. Just read the source.

**Never import directly from the `modrinth/` path.** Always import via the package name:

```ts
// correct
import { ButtonStyled } from '@modrinth/ui'
import { BellIcon } from '@modrinth/assets'

// wrong
import { ButtonStyled } from '../../modrinth/packages/ui/src/...'
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `wxt` | Extension build framework |
| `@modrinth/ui` | Modrinth's shared component library (from submodule) |
| `@modrinth/assets` | Modrinth's icon set (from submodule) |
| `@modrinth/utils` | Shared type definitions (from submodule) |
| `wxt/browser` | Cross-browser `chrome`/`browser` API polyfill |
| `floating-vue` | Tooltips and dropdowns |
| `d3-force` | Dependency explorer graph layout |
