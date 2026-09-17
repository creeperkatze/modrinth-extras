# Architecture

Modrinth Extras is a WXT-based browser extension with two content-script worlds and a background service worker.

## Content script worlds

- The main content script runs in the ISOLATED world. It cannot access page JavaScript; it mounts all Vue components, handles settings, and listens for browser messages.
- A bridge content script runs in the MAIN world on Modrinth pages. It hooks into the Nuxt router, dispatching a `modrinth-extras:router-ready` event once Nuxt's suspense boundary resolves, plus `beforeEach`/`afterEach` navigation CustomEvents. It locates the router via `window.__nuxt_app.$router` or the `#__nuxt` element's Vue app instance.
- A separate bridge patches `history.pushState`/`replaceState` on curseforge.com to detect SPA navigation there, since it has no equivalent router hook available.

## Background service worker

Owns the extension badge, browser notifications, and background polling.

## Popup

The extension's settings UI is a standalone entrypoint, independent of the content scripts.

## Injection helpers

- Single-instance injection mounts and unmounts one component per page across SPA navigations (e.g. a notifications indicator).
- Dynamic injection targets multiple DOM elements as they appear, using a MutationObserver to catch dynamically loaded content (e.g. buttons added to project cards).
