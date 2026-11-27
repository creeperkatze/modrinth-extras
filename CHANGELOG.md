# Changelog

## [Unreleased]

### Fixed

- Tags on project cards with quick actions no longer run under the last updated date for a moment after clicking a card.

## [2.1.0] - 2026-11-27

### Added

- Choice between opening Modrinth in the current tab or a new tab from CurseForge.

### Changed

- CurseForge redirect is now CurseForge integration. Instead of redirecting you automatically, it adds an Open on Modrinth button next to CurseForge's Download buttons. If you had the redirect turned on, the integration starts out turned on.
- CurseForge projects are matched to Modrinth the same way as in the Other platforms card, so a Modrinth project that only shares the slug is no longer linked.

### Fixed

- Tags on project cards with quick actions no longer run under the last updated date. Tags that don't fit are added to the +N count instead.
- Notifications in the popup now match the toolbar badge and show up right away, instead of appearing after a moment. Reading them or answering an invite in the popup or on the page updates the badge, the popup and every open Modrinth tab at once.
- Desktop notifications now arrive even when the toolbar badge is turned off.
- CurseForge projects that share their slug with a modpack or resource pack, like Create, are now found on Modrinth.

## [2.0.0] - 2026-11-22

### Added

- Lots of new color themes in Modrinth's appearance settings, sorted into collapsible sections. There are Minecraft themes like Cherry Grove, Deep Dark and The End, classics like Nord, Dracula and Synthwave '84, and the Catppuccin, Rosé Pine, Tokyo Night, Gruvbox, Everforest and Solarized families.
- Custom themes, with every color adjustable. You can share them as JSON files, and hide the preset themes in the popup if you only want your own.
- Search tab in the popup for searching Modrinth, including servers. Without a search, it shows the most popular projects.
- Creator tab in the popup with your revenue balance, upcoming payouts and charts of your views, downloads and revenue.
- Notifications tab in the popup, where you can read your notifications, accept or decline invites and mark them as read.
- Download button on collections, which bundles every project that supports your game version and loader into a modpack (.mrpack) or zip file, with their required dependencies.
- Your settings, custom themes and quick action profiles now follow you to your other browsers when browser sync is on, along with the tour and the Discord and donate banners you closed. You can have up to 100 custom themes and 30 profiles.
- A short tour the first time you open the popup, which also points out what's new after an update.
- Lucy as a mod manager option for the copy install command in the Tools card.
- Reset order button when customizing the sidebar.
- Option to reset all settings to their defaults.
- Profiles for quick actions. Save your game version, loaders and dependency option as a named profile and switch between them in the popup.

### Changed

- Redesigned the popup settings to match Modrinth's own settings. They now open from the settings button in the popup header.
- The popup now follows your Modrinth theme.
- Project card actions are now called quick actions.
- The activity sparkline now shows the last 90 days by default, instead of 60.
- The custom accent color is now an option under Themes in the popup, and works on top of any theme. Your color carries over.
- Changing an option in the popup now updates the page in place, instead of reloading the cards and buttons it affects.
- The donate banner in the popup now only shows once you've had the extension for 3 days, and the Discord banner after a week.
- Updated translations.

### Fixed

- Fixed the text color of the buttons on the Discord and donate banners in the popup.
- Fixed highlighted backgrounds being fainter than Modrinth's own with a custom accent color in dark mode.
- Fixed pages with hundreds of projects, like large collections, lagging and failing to load because of quick actions.

A huge thank you to all the translators on [Crowdin](https://crowdin.com/project/modrinth-extras), who keep up with every new feature in more and more languages <3

## [1.9.1] - 2026-11-12

### Fixed

- Fixed popup navigation buttons overflowing in some languages.

## [1.9.0] - 2026-11-11

### Added

- CurseForge comments as a source in the Reviews tab, with replies, pinned comments and a badge for the project's author. They can be turned off in the settings.
- The reasons a project was flagged in the Modgrade sidebar card, such as stealing logins or running a hidden miner.
- When a project was last checked by Modgrade, in the Modgrade sidebar card.

### Changed

- The Reviews tab now only shows a source when the project has reviews there, and says so when no reviews were found on any source.
- The Reviews tab now shows placeholders while reviews are loading.
- Paging through reviews is faster, since project and author lookups are reused for a few minutes.
- Shortened the names of the sidebar card settings.
- Updated translations.

## [1.8.3] - 2026-11-03

### Fixed

- Fixed browser notifications not turning on in Firefox.
- Fixed a rare error in the background when syncing notifications.

## [1.8.2] - 2026-11-03

### Added

- A Modgrade sidebar card, which shows a project's security check results from [Modgrade](https://modgrade.com), such as whether malware or suspicious code was found and how many of the latest files were checked. Off by default.

## [1.8.1] - 2026-10-29

### Fixed

- Fixed compare buttons missing or comparing the wrong build for versions that share a version number https://github.com/creeperkatze/modrinth-extras/issues/62.
- Fixed the buttons in the versions list not lining up when a row has no compare button.

## [1.8.0] - 2026-10-28

### Added

- Decompile links in the tools sidebar, which open the project's jar in slicer or modsrc. The decompiler can be chosen in the settings https://github.com/creeperkatze/modrinth-extras/issues/59.
- Pakku as a mod manager option for the install command https://github.com/creeperkatze/modrinth-extras/issues/60.
- Comparing versions, which opens a diff of a version's decompiled code against the previous version in modsrc. It's available on version pages, the versions list and the changelog. Off by default.
- Flags for each language in the language dropdown.
- A warning when the custom accent color is hard to see on your Modrinth theme.

### Changed

- The extension's sidebar cards can now be reordered by dragging and hidden or shown again, right from the sidebar.
- Reworked the popup into tabs and made it bigger.
- The loader dropdowns of the project card actions now show each loader's proper name and colored icon.
- The extension file size is now smaller, since unused images from Modrinth's packages are no longer included.
- Updated translations from Crowdin.

### Removed

- The Modrinth feature flag options.

### Fixed

- Fixed the monetization badge not showing.
- Fixed the casing of packwiz in the mod manager setting.

## [1.7.7] - 2026-10-20

### Added

- Developer responses to ModDex reviews, shown below the review.
- Avatars and profile links for ModDex reviewers.

### Changed

- ModDex reviews no longer need a ModDex API token, since they now use the new public ModDex API. The token setting was removed, and saved tokens are deleted.
- ModDex reviews are now found by the project's Modrinth ID, so projects with a different name on ModDex show their reviews too.
- Improved how projects are matched to SpigotMC, which now also checks a resource's contributors.
- Updated translations from Crowdin.

### Fixed

- Fixed an error when desktop notifications were enabled but the notification permission had been revoked.

## [1.7.6] - 2026-10-18

### Changed

- Updated telemetry so it now sends anonymous error reports, so bugs can be found and fixed faster. It only sends the error message and stack trace, never any details, and follows the existing telemetry toggle.
- Improved dependency explorer performance when panning and zooming large graphs.
- Updated translations from Crowdin.

### Fixed

- Fixed quick download ignoring the selected game version and downloading the newest version instead https://github.com/creeperkatze/modrinth-extras/issues/52.
- Fixed dependencies downloaded alongside a project also ignoring the selected game version.

## [1.7.5] - 2026-10-10

### Fixed

- Fixed notifications persisting when switching accounts https://github.com/creeperkatze/modrinth-extras/issues/48.

## [1.7.4] - 2026-10-09

### Changed

- The custom accent color now also recolors the green images on the hosting and app pages.

### Fixed

- Fixed the collection button of the project card actions not opening the collections menu.

## [1.7.3] - 2026-10-05

### Fixed

- Fixed tooltips not showing.

## [1.7.2] - 2026-10-04

### Changed

- The custom accent color now also applies to the site footer, the news page and parts of the home and hosting pages.

## [1.7.1] - 2026-10-03

> [!IMPORTANT]
> This is a hotfix release. See https://github.com/creeperkatze/modrinth-extras/releases/tag/v1.7.0 for the changes in version 1.7.

### Fixed

- Fixed languages not working.

## [1.7.0] - 2026-10-03

### Added

- The reviews feature, which adds a Reviews tab to project pages with community reviews from ModDex and SpigotMC. ModDex reviews need a ModDex API token, which you can get through the link in the feature settings.
- A download dependencies option for the project card actions feature, which also downloads a project's required dependencies. This option is disabled by default.

### Changed

- The extension now sends far fewer requests to Modrinth, which fixes everything suddenly failing to load after browsing for a while.
- Project card actions now load much less data when checking which version to download.
- Improved how projects are matched across platforms, so the other platforms sidebar finds the right project on CurseForge, Hangar and SpigotMC more reliably.
- Changed the depth slider in the dependency explorer to normal size.
- Updated translations.

### Fixed

- Fixed the dependency explorer showing the dependencies of a project's oldest version instead of its newest one.
- Fixed the dependency explorer leaving out some dependencies, like unlisted projects.
- Fixed the translate description button appearing on project subpages.
- Fixed incorrect pluralization of counts.

Thanks for using Modrinth Extras, and a big thank you to everyone helping translate it on Crowdin <3

## [1.6.10] - 2026-09-18

### Fixed

- Fixed an issue where all injections stopped working, caused by a bug in the extension framework.

## [1.6.9] - 2026-09-18

### Changed

- Improved the game version dropdown of the project card actions feature.
- Fully removed unused survey implementation and simplified anonymous telemetry.
- Updated translations.

## [1.6.8] - 2026-09-15

### Fixed

- Fixed dependencies in the dependency explorer not being openable in a new tab.

## [1.6.7] - 2026-09-15

### Changed

- Updated translations.

### Fixed

- Fixed issues preventing publishing to the Chrome Web Store caused by new dynamic libraries included in Mdrinths packages.

## [1.6.6] - 2026-09-09

### Added

- The other platforms sidebar, showing the same project or author on CurseForge, Hangar, and SpigotMC. This feature is disabled by default.

### Changed

- Changed display conditions for cards.
- Updated screenshots & descriptions.
- Updated translations.

## [1.6.5] - 2026-09-06

### Changed

- Migrated to Modrinth's toggle and color picker.
- The game version dropdown of the project card actions feature now only lists release versions.
- Updated Translations.

### Fixed

- Fixed inconsistent styling in the popup. It now inherits all of Modrinth's styling.

## [1.6.4] - 2026-08-19

### Changed

- Updated Modrinth dependencies, fixing some issues.
- Updated translations

## [1.6.3] - 2026-08-17

### Fixed

- Fixed modpacks sidebar being shown on user and organization pages.

## [1.6.2] - 2026-08-11

### Changed

- Improved color input hex pasting.
- Updated translations.

## [1.6.1] - 2026-08-07

### Changed

- Renamed desktop notifications to browser notifications.

### Fixed

- Fixed arrows in the dependency explorer not changing color when using blueRinth.

## [1.6.0] - 2026-08-07

### Added

- Added new modpacks sidebar by @naxturnal in https://github.com/creeperkatze/modrinth-extras/pull/15.
- Added Spanish localization thanks to [eh eh](https://crowdin.com/profile/ehuh).

### Changed

- Reworked the GitHub sidebar to be a repository sidebar. It now supports GitHub, GitLab, Codeberg and Bitbucket.
- Migrated to Modrinth's new styling for buttons & cards. Some ui components, like inputs & dropdowns might look out of place during this transition.
- Improved error handling for sidebar components.
- The dependency explorer will no longer refresh when changing the visible dependency types.

### Fixed

- Fixed GitHub / Discord sidebars not showing on Firefox and Firefox-based browsers.
- Fixed accent color not applying to some parts of the website.
- Fixed the monetization badge injecting into the tools sidebar instead of details.
- Fixed broken whitespace in descriptions when using the translate description feature.
- Fixed some injections getting applied multiple times if the extension updates.

### Removed

- Removed the verified badge from the Discord sidebar.

## [1.5.10] - 2026-08-02

### Added

- Added a description translate feature, available for browsers which support the translation api.
- Added a Discord card.

### Fixed

- Fixed color picker design in Firefox.
- Fixed logo text color in light mode.

## [1.5.9] - 2026-07-23

### Added

- Added relevant Modrinth flags as options.
- Added a custom color picker component so the accent color works on Firefox.

### Fixed

- Fixed default accent color value being the wrong shade of green.

## [1.5.8] - 2026-07-23

### Fixed

- Fixed all components re-injecting when accent color is changed.
- Fixed accent color not being applied for some components.

## [1.5.7] - 2026-07-22

### Added

- Added an accent color option, allowing you to replace the Modrinth green with a custom accent color.
- Added a monetization badge to project pages.

## [1.5.6] - 2026-07-19

### Fixed

- Fixed project card actions overlapping on following collection.

## [1.5.5] - 2026-07-19

### Changed

- Improved the dependency explorer, it now has proper highlighting and search.

## [1.5.4] - 2026-07-11

### Added

- Added a survey implementation via the existing PostHog integration. For now, this can be used as a simple, easily dismissable way of giving feedback.

## [1.5.3] - 2026-07-07

### Fixed

- Fixed the time range suboption of the activity sparkline not changing when the language is changed.

## [1.5.2] - 2026-07-06

### Added

- Added Spanish (Latin America) & Arabic localization thanks to [Dante Li Tao](https://crowdin.com/profile/heroxp) & [Hamad Alsayed](https://crowdin.com/profile/hamad_sayed).

## [1.5.1] - 2026-07-02

### Changed

- Reworked tools sidebar, added option for mod manager.
- Added time range option to the activity sparkline.

## [1.5.0] - 2026-06-27

### Changed

- Completely reworked the dependency explorer. It now fetches all dependencies in parallel and shows the entire dependency tree multiple layers deep.
- Changed the donate prompt delay.

### Fixed

- General stability improvements for requests to the Modrinth api by properly chunking large requests.

## [1.4.1] - 2026-06-15

### Fixed

- Fixed project card actions download not finding any compatible version for modpacks.

## [1.4.0] - 2026-06-15

### Added

- Added a donate prompt which only shows once after using the extension for a while.

### Changed

- Completely reworked project card actions. The extension now properly searches for versions based on the selected game version and loader.
- Updated component styling to the newest upstream state.

### Removed

- The analytics export feature has been removed. Since Modrinth overhauled analytics, maintaining this has become impossible.

## [1.3.10] - 2026-06-12

### Changed

- The extension description is now localized.

## [1.3.9] - 2026-06-06

### Fixed

- Fixed Firefox version not being available on Android.

## [1.3.8] - 2026-06-04

### Fixed

- Fixed the error notice showing on completely unrelated errors.

## [1.3.7] - 2026-05-07

### Added

- Added Turkish translation thanks to [penfflewithadot](https://crowdin.com/profile/penfflewithadot).

### Changed

- Updated button styling and injection logic so minor website changes wont break functionality as easily.

### Fixed

- Fixed sidebar features not injecting.
- Fixed analytics export button styling.

## [1.3.6] - 2026-04-29

### Fixed

- Fixed labels in project page tools overflowing due to an upstream change.

## [1.3.5] - 2026-04-27

### Added

- Added Russian & Ukranian translations thanks to [vanapro1](https://crowdin.com/profile/vanapro1) & [Tenwoc](https://crowdin.com/profile/tenwoc).

### Fixed

- Fixed outdated Modfolio url.

## [1.3.4] - 2026-04-13

### Changed

- Improved popup footer design
- Added support link

### Fixed

- Fixed footer overflowing in some languages

## [1.3.3] - 2026-04-06

### Added

- Analytics export: Adds a button to download analytics charts as PNG images.

### Fixed

- Fix extension logo having no font in the popup

## [1.3.2] - 2026-04-03

### Changed

- Add chinese simplified (thanks [xinyihl](https://crowdin.com/profile/xinyihl))

### Fixed

- Fix chrome web store compliance by stripping modules

## [1.3.1] - 2026-04-01

### Fixed

- Fix workflow generating empty extensions zips

## [1.3.0] - 2026-04-01

### Added

- Languages: Help translate on [Crowdin](https://crowdin.com/project/modrinth-extras). Some languages may be incomplete.
- Gallery background: Display the featured gallery image as a background banner on project pages.
- Dependency graph: Explore a projects dependencies in a node-based visualization. Accessible via a button on the dependency sidebar.

### Changed

- Add recent searches to quick search
- Add sort types, environment types and licenses to quick search
- Add extension disclaimer to website errors

### Fixed

- Fix website sometimes breaking https://github.com/creeperkatze/modrinth-extras/issues/6 (thanks @Vanilama-modded and @maDU59)
- Miscellaneous fixes

## [1.2.6] - 2026-03-25

### Fixed

- Fix project card actions mod loader dropdown showing all loaders

## [1.2.5] - 2026-03-24

### Fixed

- Fix some settings not saving on Firefox

## [1.2.4] - 2026-03-24

### Fixed

- Fix potential memory leak with mutation observers
- Improve error handling

## [1.2.3] - 2026-03-24

### Changed

- Add mod / plugin loader option for the download button project card actions
- Improved extension popup design

### Fixed

- Make the dependency sidebar a scrollable panel

## [1.2.2] - 2026-03-20

### Fixed

- Fix Firefox compliance

## [1.2.1] - 2026-03-20

### Fixed

- Fix header overflowing on Firefox
- Reduce update checker caching

## [1.2.0] - 2026-03-20

### Added

- Desktop notifications: Operating system notifications for your Modrinth notifications
- Project card actions: Download, follow, and bookmark projects right from their project cards
- CurseForge redirect: Redirect CurseForge project pages to Modrinth when available
- Telemetry: Help improve the extension by anonymously sharing statistics like the extension version and which features are enabled. No Modrinth data, activity, or personal information is ever collected. See: https://github.com/creeperkatze/modrinth-extras/blob/main/PRIVACY.md

### Changed

- Caching for notifications
- Stability improvements
- Improved extension popup design

### Fixed

- Fix badge on Firefox
- Fix extension popup not supporting light mode
- Miscellaneous fixes

## [1.1.4] - 2026-03-17

### Fixed

- Fix notification indicator bell icon flipping when there are no notifications
- Fix quick search not applying filters when starting from the target page

## [1.1.3] - 2026-03-17

### Changed

- Updated icon & logo

### Fixed

- Fixes styling of labels in the tool sidebar

## [1.1.2] - 2026-03-17

### Fixed

- Fix some versions not being searchable in quick search by prioritizing shorter versions: https://github.com/creeperkatze/modrinth-extras/issues/1 (thanks @CerealCamera)

## [1.1.1] - 2026-03-17

### Fixed

- Fixes the design of quick search

## [1.1.0] - 2026-03-17

### Added

- Added quick search, a command palette style search accessible anywhere on the site.
- Added an activity sparkline. Shows release activity chart on project pages.
- Added a Github sidebar. Shows GitHub statistics in the project sidebar.
- Added a Discord sidebar. Shows Discord statistics in the project sidebar.

### Changed

- Overhauled the extension popup design.

### Fixed

- Performance improvements for page transitions.
- Miscellaneous fixes & improvements.

## [1.0.11] - 2026-03-15

### Changed

- Improved logging

### Fixed

- Add Firefox android support

## [1.0.10] - 2026-03-15

### Fixed

- Fix initial injection causing website errors

## [1.0.9] - 2026-03-15

### Fixed

- Fix injection causing website errors

## [1.0.8] - 2026-03-15

### Changed

- Overhaul option descriptions

### Fixed

- Fix Firefox notification count badge

## [1.0.7] - 2026-03-14

### Changed

- Added update checker
- Fixed notification count badge not updating when using the notification indicator

## [1.0.6] - 2026-03-14

Initial release

[Unreleased]: https://github.com/creeperkatze/modrinth-extras/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/creeperkatze/modrinth-extras/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.9.1...v2.0.0
[1.9.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.8.3...v1.9.0
[1.8.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.8.2...v1.8.3
[1.8.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.7...v1.8.0
[1.7.7]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.6...v1.7.7
[1.7.6]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.5...v1.7.6
[1.7.5]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.10...v1.7.0
[1.6.10]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.9...v1.6.10
[1.6.9]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.8...v1.6.9
[1.6.8]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.10...v1.6.0
[1.5.10]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.9...v1.5.10
[1.5.9]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.8...v1.5.9
[1.5.8]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.7...v1.5.8
[1.5.7]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.6...v1.5.7
[1.5.6]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.5...v1.5.6
[1.5.5]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.4...v1.5.5
[1.5.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.10...v1.4.0
[1.3.10]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.9...v1.3.10
[1.3.9]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.8...v1.3.9
[1.3.8]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.7...v1.3.8
[1.3.7]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.6...v1.3.7
[1.3.6]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.5...v1.3.6
[1.3.5]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.6...v1.3.0
[1.2.6]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.1.4...v1.2.0
[1.1.4]: https://github.com/creeperkatze/modrinth-extras/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/creeperkatze/modrinth-extras/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/creeperkatze/modrinth-extras/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/creeperkatze/modrinth-extras/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.11...v1.1.0
[1.0.11]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.10...v1.0.11
[1.0.10]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.9...v1.0.10
[1.0.9]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/creeperkatze/modrinth-extras/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/creeperkatze/modrinth-extras/releases/tag/v1.0.6
