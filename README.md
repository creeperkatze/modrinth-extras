# <img src="public/icon.svg" alt="Modrinth Extras" width="24"> Modrinth Extras

Adds unofficial extra features to the [Modrinth](https://modrinth.com) website.

![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/modrinth-extras?style=flat&labelColor=0d143c)

> [!NOTE]
> This repository is a mirror of [`apps/browser-extension`](https://github.com/creeperkatze/modrinth/tree/browser-extension/apps/browser-extension) in the [creeperkatze/modrinth](https://github.com/creeperkatze/modrinth) monorepo, synced via `git subtree`. Pull requests should be created there, while issues should be opened in this repository.

## 🚀 Installation

Install from your browser's extension store:

- **[Chrome Web Store](#)**
- **[Firefox Add-ons](#)**

You must be logged in to modrinth.com for all features to work.

## ✨ Features

### Notification Indicator

A live bell icon is injected into the Modrinth header, showing the count of unread notifications. Click it to open a dropdown with your recent unread notifications — accept or decline team/organization invites, mark individual notifications as read, or clear them all at once. Auto-refreshes every minute.

### Sidebar Extras

On project, user, organization, and collection pages, an **Extra** card is added to the sidebar with quick actions:

- **Generate embed** — opens [Modfolio](https://modfolio.creeperkatze.de) pre-loaded with the current page URL to generate an embeddable card or badge.

### Footer Badge

The extension version is shown in the site footer alongside the other Modrinth links.

## 👨‍💻 Development

### Prerequisites

- Node.js
- pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/creeperkatze/modrinth-extras.git
cd modrinth-extras

# Install dependencies
pnpm install

# Start development server (Chrome)
pnpm wxt dev

# Start development server (Firefox)
pnpm wxt dev -b firefox
```

Loading the unpacked extension:

1. Open `chrome://extensions` (or `about:debugging` in Firefox)
2. Enable Developer Mode
3. Click **Load unpacked** and select the `.output/chrome-mv3-dev` directory

### Build

```bash
# Production build for Chrome
pnpm wxt build

# Production build for Firefox
pnpm wxt build -b firefox
```

## 🤝 Contributing

Contributions are always welcome!

This repository is a publish mirror, development happens in the [`browser-extension` branch](https://github.com/creeperkatze/modrinth/tree/browser-extension) of [creeperkatze/modrinth](https://github.com/creeperkatze/modrinth). To contribute, open a pull request there against `apps/browser-extension`.

The extension depends on `@modrinth/ui` and `@modrinth/assets` as local workspace packages, so it cannot be built outside of the monorepo.

## 📜 License

MIT
