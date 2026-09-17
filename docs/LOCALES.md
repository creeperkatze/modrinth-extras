# Locales / i18n

UI strings use Vue I18n via the shared UI package's `defineMessages` + `useVIntl`. Other languages are managed via Crowdin.

**Never edit locale JSON files by hand**, they are generated from `defineMessages` calls in source files.

After adding or changing a `defineMessages` entry, regenerate them:

```bash
pnpm intl:extract
```
