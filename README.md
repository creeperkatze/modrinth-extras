# <img src="public/icon.svg" alt="Modrinth Extras" width="32"> Modrinth Extras

A browser extension adding unofficial extra features to the [Modrinth](https://modrinth.com) website.

![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/modrinth-extras?style=flat&labelColor=0d143c)

> [!IMPORTANT]
> This repository is a mirror of [`apps/browser-extension`](https://github.com/creeperkatze/modrinth/tree/browser-extension/apps/browser-extension) in the [creeperkatze/modrinth](https://github.com/creeperkatze/modrinth) monorepo, synced via `git subtree`. Pull requests should be created there, while issues should be opened in this repository.

## 🚀 Installation

Install from your browser's extension store:

- **[Chrome Web Store](#)**
- **[Firefox Add-ons](#)**

You must be logged in to modrinth.com for all features to work.

## ✨ Features

### Notification Indicator

A live bell icon is injected into the Modrinth header, showing the count of unread notifications. Click it to open a dropdown with your recent unread notifications, accept or decline team/organization invites, mark individual notifications as read, or clear them all at once.

### Sidebar Extras

On project, user, organization, and collection pages, an **Extra** card is added to the sidebar with quick actions:

- **Generate embed:** opens [Modfolio](https://modfolio.creeperkatze.de) pre-loaded with the current page URL to generate an embeddable card or badge.

## 👨‍💻 Development

> [!IMPORTANT]
> The extension depends on `@modrinth/ui` and `@modrinth/assets` as local workspace packages, so it must be built from within the [creeperkatze/modrinth](https://github.com/creeperkatze/modrinth/tree/browser-extension) monorepo.

### Setup

```bash
git clone https://github.com/creeperkatze/modrinth.git -b browser-extension
cd modrinth

# Install dependencies
pnpm install

# Start dev server (Chrome)
pnpm ext:dev

# Start dev server (Firefox)
pnpm ext:dev:firefox
```

Then load the extension:

1. Open `chrome://extensions` (or `about:debugging#/runtime/this-firefox` in Firefox)
2. Enable **Developer Mode**
3. Click **Load unpacked** and select `apps/browser-extension/.output/chrome-mv3-dev`

### Build

```bash
# Production build for Chrome
pnpm ext:build

# Production build for Firefox
pnpm ext:build:firefox
```

## 🤝 Contributing

Contributions are always welcome! Open a pull request in the [creeperkatze/modrinth](https://github.com/creeperkatze/modrinth/tree/browser-extension) monorepo against `apps/browser-extension`, as described in the [Development](#‍-development) section.

## 📜 License

AGPL-3.0
