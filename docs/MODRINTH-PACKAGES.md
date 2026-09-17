# Modrinth submodule packages

`@modrinth/ui`, `@modrinth/assets`, `@modrinth/utils`, and `@modrinth/api-client` come from the `modrinth/` git submodule (the upstream `modrinth/code` monorepo), consumed as local workspace packages.

When investigating components, icons, or types, read the submodule source directly. Don't rely on memory for props, exports, or type names, since they shift between submodule versions.

**Never import from the submodule's internal path**, always use the package name:

```ts
import { ButtonStyled } from '@modrinth/ui'
import { BellIcon } from '@modrinth/assets'
```
