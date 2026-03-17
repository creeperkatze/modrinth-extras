# <img src="src/public/icon.svg" alt="Icon" width="32"> Modrinth Extras

A browser extension adding unofficial extra features to the [Modrinth](https://modrinth.com) website.

![GitHub Branch Check Runs](https://img.shields.io/github/check-runs/creeperkatze/modrinth-extras/main?labelColor=0d143c)
![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/modrinth-extras?style=flat&labelColor=0d143c)

## 🚀 Installation

Install from your browser's extension store:

- **[Chrome Web Store](#)**
- **[Firefox Add-Ons](#)**
- **[Edge Add-Ons](#)**

Or install manually from the latest [GitHub release](https://github.com/creeperkatze/modrinth-extras/releases):

1. Download the zip for your browser from the release assets.
2. **Chrome / Edge:** go to `chrome://extensions/`, enable **Developer mode**, then drag and drop the zip onto the page.
3. **Firefox:** go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the zip. Note that Firefox removes the extension on browser restart since it is loaded as a temporary add-on.

Prefer to build from source? See [Building from source](#-building-from-source) below.

## ✨ Features

### Notification Indicator

Adds a live bell icon to the Modrinth header showing your unread notification count. Click it to open a dropdown with your recent unread notifications, accept or decline team/organization invites, mark individual notifications as read, or clear them all at once.

<img src=".github/assets/screenshots/notifications.png" width="400">

### Quick Search

Opens a command palette-style search modal with <kbd>Ctrl+K</kbd> or <kbd>/</kbd>. Supports faceted search with inline tags for loader, category, game version, and project type, with highlighted suggestions and pre-configured examples.

<video src=".github/assets/videos/quicksearch.mp4" controls width="640"></video>

### Activity Sparkline

Adds an animated SVG chart to project pages showing release activity over the past 60 days, giving a quick visual overview of how actively a project is maintained.

<img src=".github/assets/screenshots/sparkline.png" width="400">

### Tools Sidebar

Adds a tools card to the sidebar on project, user, organization, and collection pages with the following items:

- **Generate embed:** opens [Modfolio](https://modfolio.creeperkatze.de) pre-loaded with the current page URL to generate an embeddable card or badge.
- **View API response:** opens the raw Modrinth API JSON for the current page in a new tab.

On project pages, two additional developer utilities are shown:

- **Copy download URL:** copies the direct download URL of the project's latest primary file to the clipboard.
- **Copy packwiz:** copies the `packwiz mr add <slug>` command to the clipboard.

<img src=".github/assets/screenshots/tools.png" width="400">

### Dependency Sidebar

On project pages, a dependencies card shows the project's full dependency tree. Each dependency can be expanded up to two levels deep to inspect transitive dependencies, with lazy loading on expand.

<img src=".github/assets/screenshots/dependencies.png" width="400">

### GitHub Sidebar

On project pages that link to a GitHub repository, shows a sidebar card with live stats: stars, open issues, open pull requests, and forks.

<img src=".github/assets/screenshots/github.png" width="400">

### Discord Sidebar

On project pages that include a Discord invite, shows a sidebar card with the server name, description, member count, online count, and icon.

<img src=".github/assets/screenshots/discord.png" width="400">

### Notification Badge

Shows your unread notification count as a badge on the extension icon. The background script polls for updates every 5 minutes and keeps the badge in sync even when the popup is closed.

## 🔒 Building from source

If you don't want to trust the store release, you can build the extension yourself directly from the source code and verify it matches what's in this repository.

**Prerequisites:** [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io)

```bash
# Clone and check out the version you want to verify (e.g. v1.0.11)
git clone https://github.com/creeperkatze/modrinth-extras.git
cd modrinth-extras
git checkout v1.0.11

pnpm install

# Chrome / Edge
pnpm zip

# Firefox
pnpm zip:firefox
```

The resulting zips in `.output/` are identical to those attached to the [GitHub release](https://github.com/creeperkatze/modrinth-extras/releases) for that tag. See the [Installation](#-installation) section for instructions on loading the zip in your browser.

## 👨‍💻 Development

### Setup

```bash
git clone https://github.com/creeperkatze/modrinth-extras.git
cd modrinth-extras

pnpm install
```

### Chrome

```bash
pnpm build
```

Then go to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `.output/chrome-mv3` folder. After rebuilding, just click on the reload icon.

### Firefox

```bash
pnpm zip:firefox
```

Then go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the zip from the `.output/` folder. After rebuilding, repeat this process.

> [!NOTE]
> `pnpm dev` can also be used during development to automatically create a temporary browser with the extension pre-loaded. Keep in mind that this browser profile is isolated, requiring you to log in each time. This method also causes issues with Modrinth's dependencies.

## 🤝 Contributing

Contributions are always welcome!

Please ensure you run `pnpm lint` before opening a pull request.

## 📜 License

AGPL-3.0
