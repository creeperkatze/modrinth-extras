# Code style and conventions

## Style

Formatted with Prettier: tabs, single quotes, no semicolons, trailing commas, 100-character lines, LF line endings.

## API calls

Use the shared `modrinthClient` from `src/api/client.ts` rather than calling `fetch` directly. It reads the auth token from the `auth-token` cookie automatically. It also shares identical GET requests between components and pauses after being rate limited, so fetching the same data from several components is fine.

## Settings

Read settings through the shared `getSettings()` helper. Never read extension storage directly from components.

Any setting that holds a credential, like an API token, must be listed in `SECRET_SETTINGS`. Use `withoutSecrets()` whenever settings are logged or sent anywhere.

## Logging

- Prefix every log message with `[Modrinth Extras]`, plus a subsystem sub-prefix where relevant (e.g. `[Modrinth Extras] Badge:`).
- Use `console.error` for problems, always passing the error value as the last argument: `console.error('[Modrinth Extras] Failed to fetch:', err)`.
- Use `console.log` for informational messages, phrased in the past tense ("Loaded", "Injected").
- Don't use `console.warn`.
