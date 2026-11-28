# Architecture

Modrinth Extras is a WXT-based browser extension with two content-script worlds and a background service worker.

## Project structure

- `src/entrypoints/` holds the WXT entrypoints. Keep them thin and wire things up from the folders below.
- `src/api/` talks to Modrinth: the shared `modrinthClient`, its request cache, and API helpers.
- `src/core/` holds services every context uses: settings, telemetry and i18n. Features may import from `core/`, never the other way round.
- `src/content/` is the content-script runtime. `injection.ts` holds the injection helpers, `page.ts` shared page helpers like attaching to the sidebar, and `injections/` defines every injection grouped by page area, mirroring `src/components/`. The entrypoint only wires them to hydration, settings and navigation.
- `src/features/<feature>/` holds the logic of one feature. Its Vue components stay in `src/components/`, grouped by where they appear on the page.
- `src/background/` holds service worker logic. `background/external/` has the clients for other services, which only run in the worker. `platforms/` and `repositories/` each group their clients behind an `index.ts` that queries all of them.
- `src/utils/` is only for small generic helpers. If a helper imports the API client or settings, it belongs somewhere else.

## Content script worlds

- The main content script runs in the ISOLATED world. It cannot access page JavaScript; it mounts all Vue components, handles settings, and listens for browser messages.
- A bridge content script runs in the MAIN world on Modrinth pages. It reaches the Vue app through the `#__nuxt` element's `__vue_app__`, and Nuxt through its `$nuxt`. Once Nuxt finishes hydrating it dispatches `modrinth-extras:hydrated` and sets `data-modrinth-extras-hydrated` on `<html>`, for a content script that starts later. It also turns the router's `beforeEach`/`afterEach` into navigation CustomEvents. Injecting before hydration finishes makes Nuxt throw.
- A separate bridge patches `history.pushState`/`replaceState` on curseforge.com to detect SPA navigation there, since it has no equivalent router hook available.
- UI injected into CurseForge can't use Modrinth's CSS variables or `@modrinth/ui` styles. Its components in `src/components/curseforge/` get their own Tailwind build from `tailwind.external.config.ts`, scoped under the `modrinth-extras-ui` class so it never touches the host page.

## Background service worker

Owns the extension badge, browser notifications, and background polling.

It is the only writer of the stored notifications in `features/notifications/store.ts`, with their extra data attached. The badge, the popup and the page indicator all show that one copy. Other contexts send it `refresh-notifications` and `set-notifications-read` messages and watch the store through `useNotifications()`.

## Popup

A standalone entrypoint, independent of the content scripts. `App.vue` is only the header, tabs and footer. Each tab is a view in `popup/views/`: Search, Creator and the settings behind the header button. Views share state through `popup/state/`, like the loaded settings and the signed in account.

- The popup reads the `auth-token` cookie through the cookies API, since an extension page only sees its own cookies.
- It starts from scratch every time it opens, so `useCachedResource` keeps the last result in extension storage to show right away while it refreshes.
- Links open in the current tab through the content script's `navigate` message when it is on Modrinth, and in a new tab otherwise.

## Injection helpers

- Single-instance injection mounts and unmounts one component per page across SPA navigations (e.g. a notifications indicator).
- Dynamic injection targets multiple DOM elements as they appear, using a MutationObserver to catch dynamically loaded content (e.g. buttons added to project cards).
