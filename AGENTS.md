# Modrinth Extras 

Modrinth Extras is a browser extension that enhances the Modrinth website with extra features, built with WXT, Vue 3, TypeScript and Tailwind CSS.

This project uses pnpm workspaces. The Modrinth upstream packages (`@modrinth/ui`, `@modrinth/assets`, `@modrinth/utils`, `@modrinth/api-client`) come from the `modrinth/` git submodule, consumed as local workspace packages.

## Commands

- `pnpm build` builds for Chrome/Edge, `pnpm build:firefox` for Firefox.
- `pnpm zip` packages a zip for Chrome/Edge, `pnpm zip:firefox` for Firefox.
- `pnpm lint` lints, `pnpm lint:fix` lints and auto-fixes.
- There is no automated test suite; testing is manual in the browser.

## Rules

- Never edit locale JSON files by hand, they're generated from `defineMessages` calls. After adding or changing one, run `pnpm intl:extract` to regenerate them.
- Never import from the `modrinth/` submodule's internal path; always import from the package name, e.g. `import { ButtonStyled } from '@modrinth/ui'`.
- Only write a comment when the code can't explain something itself. Keep it short and simple: no em dashes, no semicolons, no nested clauses.

For the content-script worlds, background worker and injection helpers, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
For code style, API/settings access and logging conventions, see [docs/CONVENTIONS.md](docs/CONVENTIONS.md).
For the full i18n / locale workflow, see [docs/LOCALES.md](docs/LOCALES.md).
For working with the Modrinth submodule packages, see [docs/MODRINTH-PACKAGES.md](docs/MODRINTH-PACKAGES.md).
