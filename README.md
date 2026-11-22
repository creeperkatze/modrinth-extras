# <img src=".github/assets/logo.svg" alt="Modrinth Extras" height="100">

A browser extension that enhances Modrinth on the website and beyond.

![GitHub Branch Check Runs](https://img.shields.io/github/check-runs/creeperkatze/modrinth-extras/main)
![GitHub Issues](https://img.shields.io/github/issues/creeperkatze/modrinth-extras)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/creeperkatze/modrinth-extras)
[![Crowdin](https://badges.crowdin.net/modrinth-extras/localized.svg)](https://crowdin.com/project/modrinth-extras)
![GitHub Repo stars](https://img.shields.io/github/stars/creeperkatze/modrinth-extras?style=flat)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/creeperkatze)

> [!NOTE]
> The extension is not associated with or endorsed by Modrinth.

## 🚀 Installation

Install from your browser's extension store:

- **[Chrome Web Store](https://chromewebstore.google.com/detail/modrinth-extras/ajmkilipadfpaefpcjfgnkejalmhdlcj)** ![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/ajmkilipadfpaefpcjfgnkejalmhdlcj?label=)![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/ajmkilipadfpaefpcjfgnkejalmhdlcj?style=flat&color=yellow)
- **[Firefox Add-Ons](https://addons.mozilla.org/firefox/addon/modrinth-extras/)** ![Mozilla Add-on Version](https://img.shields.io/amo/v/modrinth-extras?label=)![Mozilla Add-on Users](https://img.shields.io/amo/users/modrinth-extras?style=flat&color=yellow)
- **[Edge Add-Ons](https://microsoftedge.microsoft.com/addons/detail/modrinth-extras/jkfgnimibfpoohbmaibjdjdmfnjmbjcj)** ![Edge Addon Version](https://img.shields.io/badge/dynamic/json?label=&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjkfgnimibfpoohbmaibjdjdmfnjmbjcj)![Edge Addon Users](https://img.shields.io/badge/dynamic/json?label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fjkfgnimibfpoohbmaibjdjdmfnjmbjcj?style=flat&color=yellow)

Prefer to build from source? See [🔒 Building from source](#-building-from-source) below.

## ✨ Features

<!-- features:start -->
<table>
<tr>
<td width="50%"><img src="website/public/screenshots/project.png"></td>
<td width="50%"><h3>A page that matches the project</h3>Display a project's featured gallery image as a full banner background, so shaders and resource packs look the part.</td>
</tr>
<tr>
<td width="50%"><h3>Make Modrinth your own</h3>Pick from dozens of new color themes, from Cherry Grove and The End to Catppuccin, Nord and Dracula. Or build your own with every color adjustable, and share it with friends.</td>
<td width="50%"><img src="website/public/screenshots/themes.png"></td>
</tr>
<tr>
<td width="50%"><img src="website/public/screenshots/quick-actions.png"></td>
<td width="50%"><h3>Straight from the search results</h3>Download, follow, and save projects right from their cards. Save your game version and loaders as profiles, and switch between them from the popup.</td>
</tr>
<tr>
<td width="50%"><h3>Explore the full dependency tree</h3>An interactive graph lets you dig through a project's required, optional, and embedded dependencies, as deep as you want to go.</td>
<td width="50%"><img src="website/public/screenshots/dependency-explorer.png"></td>
</tr>
<tr>
<td width="50%"><img src="website/public/screenshots/popup-creator.png"></td>
<td width="50%"><h3>Modrinth, from any tab</h3>Search for projects and servers, read your notifications, accept invites, and check your creator revenue and stats, all from the extension popup.</td>
</tr>
<tr>
<td width="50%"><h3>A whole collection in one download</h3>Turn any collection into a modpack or zip file with every project that supports your game version and loader, required dependencies included.</td>
<td width="50%"><img src="website/public/screenshots/collection-download.png"></td>
</tr>
<tr>
<td width="50%"><img src="website/public/screenshots/notifications.png"></td>
<td width="50%"><h3>Notifications, right in the header</h3>View, manage, and clear unread notifications without leaving the page you're on, with optional browser notifications and an unread badge on the extension icon.</td>
</tr>
<tr>
<td width="50%"><h3>Find anything in seconds</h3>Press Ctrl+K or / to open a command palette style search, with faceted tags for loaders, versions, categories, and types built right into your query.</td>
<td width="50%"><img src="website/public/screenshots/quick-search.png"></td>
</tr>
</table>
<!-- features:end -->

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

### Translators ❤️

| Language               | Translators                                                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Italian                | [EmanuelPlaysDev](https://github.com/EmanuelPlays)                                                                                                                                                 |
| French                 | [maDU59_](https://github.com/maDU59), [Sertra](https://crowdin.com/profile/sertrafurr), [Crazy10061](https://crowdin.com/profile/crazy10061)                                                       |
| Chinese Simplified     | [xinyihl](https://crowdin.com/profile/xinyihl), [AlexYang](https://crowdin.com/profile/A012pyshjs210), [Ethan Caldwell](https://crowdin.com/profile/ethan-caldwell)                                |
| Korean                 | [젠고](https://crowdin.com/profile/minejango2)                                                                                                                                                     |
| Vietnamese             | [Lê](https://crowdin.com/profile/suri-cutie)                                                                                                                                                       |
| Japanese               | [Finity 2010](https://crowdin.com/profile/finity2010)                                                                                                                                              |
| Russian                | [vanapro1](https://crowdin.com/profile/vanapro1), [IceBan](https://crowdin.com/profile/iceban), [knowtion](https://crowdin.com/profile/knowtion), [wixewsky](https://crowdin.com/profile/wixewsky) |
| Ukrainian              | [Tenwoc](https://crowdin.com/profile/tenwoc), [CreativeTragern](https://crowdin.com/profile/creativetragern)                                                                                       |
| Turkish                | [penfflewithadot](https://crowdin.com/profile/penfflewithadot), [ErenTr4210](https://crowdin.com/profile/erentr4210), [Serkan Aynacı](https://crowdin.com/profile/serkanaynaci2007)                |
| Spanish, Latin America | [Dante Li Tao](https://crowdin.com/profile/heroxp)                                                                                                                                                 |
| Arabic                 | [Hamad Alsayed](https://crowdin.com/profile/hamad_sayed)                                                                                                                                           |
| Spanish                | [eh eh](https://crowdin.com/profile/ehuh)                                                                                                                                                          |
| Polish                 | [lumiscosity](https://crowdin.com/profile/lumiscosity), [mai](https://crowdin.com/profile/chanjustin67), [Unndee](https://crowdin.com/profile/unndee)                                              |
| German                 | [Johan](https://crowdin.com/profile/myxoraptor), [An Otte](https://crowdin.com/profile/a_otte)                                                                                                     |
| Dutch                  | [Jethro](https://crowdin.com/profile/jethromeow)                                                                                                                                                   |
| Thai                   | [Cathrinth](https://crowdin.com/profile/fryrvo)                                                                                                                                                    |

## 🤝 Contributing

Contributions are always welcome!

Please ensure you run `pnpm lint:fix` and `pnpm fmt` before opening a pull request.

## 📜 License

AGPL-3.0
