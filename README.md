# <img src=".github/assets/logo.png" alt="Modrinth Extras" height="100">

A browser extension that enhances Modrinth on the website and beyond.

![GitHub Branch Check Runs](https://img.shields.io/github/check-runs/creeperkatze/modrinth-extras/main?labelColor=0d143c)
![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/modrinth-extras?labelColor=0d143c)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/modrinth-extras?style=flat&labelColor=0d143c)
[![Crowdin](https://badges.crowdin.net/modrinth-extras/localized.svg)](https://crowdin.com/project/modrinth-extras)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F11WYJU3)

> [!NOTE]
> The extension is not associated with or endorsed by Modrinth.

## 🚀 Installation

Install from your browser's extension store:

- **[Chrome Web Store](https://chromewebstore.google.com/detail/modrinth-extras/ajmkilipadfpaefpcjfgnkejalmhdlcj)** ![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/ajmkilipadfpaefpcjfgnkejalmhdlcj?label=)![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/ajmkilipadfpaefpcjfgnkejalmhdlcj?style=flat&labelColor=0d143c&color=yellow)
- **[Firefox Add-Ons](https://addons.mozilla.org/firefox/addon/modrinth-extras/)** ![Mozilla Add-on Version](https://img.shields.io/amo/v/modrinth-extras?label=)![Mozilla Add-on Users](https://img.shields.io/amo/users/modrinth-extras?style=flat&labelColor=0d143c&color=yellow)
- **[Edge Add-Ons](https://microsoftedge.microsoft.com/addons/detail/modrinth-extras/jkfgnimibfpoohbmaibjdjdmfnjmbjcj)** ![Edge Addon Version](https://img.shields.io/badge/dynamic/json?label=&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjkfgnimibfpoohbmaibjdjdmfnjmbjcj)![Edge Addon Users](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjkfgnimibfpoohbmaibjdjdmfnjmbjcj?style=flat&labelColor=0d143c&color=yellow)

Prefer to build from source? See [Building from source](#-building-from-source) below.

## ✨ Features

All features can be individually toggled from the extension popup.

<img src=".github/assets/screenshots/extension.png" width="100%">

### Language

Help translate on [Crowdin](https://crowdin.com/project/modrinth-extras). Some languages may be incomplete.

### Notifications

View, manage, and clear unread notifications right in the header without leaving the current page.

<img src=".github/assets/screenshots/notifications.png" width="100%">

### Quick search

Ctrl+K or / for a command palette style search with faceted tags for loaders, versions, categories, and types.

<img src=".github/assets/screenshots/quicksearch.gif" width="100%">

### Project card actions

Download, follow, and save projects right from their project cards.

- **Download:** downloads the latest primary file directly.
- **Follow / Unfollow:** follow or unfollow the project.
- **Save:** save or remove the project from your collections.
- **Copy link:** copy the project's link to your clipboard.

<img src=".github/assets/screenshots/project-card-actions.png" width="100%">

### Analytics export

Adds a button to download analytics charts as PNG images.

### Activity sparkline

Release activity chart on project pages.
<img src=".github/assets/screenshots/sparkline.png" width="100%">
### Tools sidebar

Generate embeds, view raw API responses, copy download URLs and packwiz commands.

- **Generate embed:** opens [Modfolio](https://modfolio.creeperkatze.de) pre-loaded with the current page URL to generate an embeddable card or badge.
- **View API response:** opens the raw Modrinth API JSON for the current page in a new tab.

On project pages, two additional developer utilities are shown:

- **Copy download URL:** copies the direct download URL of the project's latest primary file to the clipboard.
- **Copy packwiz:** copies the `packwiz mr add <slug>` command to the clipboard.

### Dependency sidebar

Collapsible dependency tree on project pages. Includes a dependency explorer to visualize the full dependency graph.

### GitHub sidebar

Stars, issues, pull requests, and forks for linked repositories.

### Discord sidebar

Server name, description, member count, and online count for linked Discord servers.

<img src=".github/assets/screenshots/sidebar.png" width="100%">

### Gallery background

Display the featured gallery image as a background banner on project pages.

<img src=".github/assets/screenshots/gallery-background.png" width="100%">

### Notification badge

Up-to-date unread notification count as a badge on the extension icon.

### Desktop notifications

Operating system notifications for your Modrinth notifications.

### CurseForge redirect

Redirect CurseForge project pages to Modrinth when available.

## 🔒 Building from source

If you don't want to trust the store release, you can build the extension yourself directly from the source code and verify it matches what's in the release.

**Prerequisites:** [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io)

```bash
# Clone and check out the version you want to verify (e.g. v1.3.3)
git clone --recurse-submodules https://github.com/creeperkatze/modrinth-extras.git
cd modrinth-extras
git checkout v1.3.3

pnpm install

# Chrome / Edge
pnpm zip

# Firefox
pnpm zip:firefox
```

The resulting zips in `.output/` are identical to those attached to the [GitHub release](https://github.com/creeperkatze/modrinth-extras/releases) for that tag.

To install the extension manually:

- **Chrome / Edge:** go to `chrome://extensions/`, enable **Developer mode**, then drag and drop the zip onto the page.
- **Firefox:** go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the zip. Note that Firefox removes the extension on browser restart since it is loaded as a temporary add-on.


## 👨‍💻 Development

### Setup

> [!IMPORTANT]
> The `--recurse-submodules` flag is required as the project imports packages from the [modrinth](https://github.com/modrinth/code) monorepo as a git submodule.

```bash
git clone --recurse-submodules https://github.com/creeperkatze/modrinth-extras.git
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

## 🌐 Translating

Translations are managed on [Crowdin](https://crowdin.com/project/modrinth-extras). You can contribute without any technical knowledge, just pick your language and start translating.

New translations are automatically pulled every Monday.

### Contributors ❤️

| Language | Translators |
|----------|------------|
| Italian | [EmanuelPlaysDev](https://github.com/EmanuelPlays) |
| French | [maDU59_](https://github.com/maDU59) |
| Chinese Simplified | [xinyihl](https://crowdin.com/profile/xinyihl) |
| Korean | [젠고](https://crowdin.com/profile/minejango2) |
| Vietnamese | [Lê](https://crowdin.com/profile/suri-cutie) |
| Russian | [vanapro1](https://crowdin.com/profile/vanapro1) |
| Ukrainian | [Tenwoc](https://crowdin.com/profile/tenwoc) |

## 🤝 Contributing

Contributions are always welcome!

Please ensure you run `pnpm lint` before opening a pull request.

## 📜 License

AGPL-3.0
