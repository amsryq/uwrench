<div align="center">
	<img height="150" alt="uwrench" src="https://github.com/user-attachments/assets/5a29b807-e556-4155-a5aa-c51619cfc43f" />
	<p align="center">A browser extension that fixes common UX pain points on the UiTM UFUTURE portal.</p>

[![Version](https://img.shields.io/github/package-json/v/amsryq/uwrench?logo=github)](https://github.com/amsryq/uwrench)
[![Code Size](https://img.shields.io/github/languages/code-size/amsryq/uwrench?color=blue)](https://github.com/amsryq/uwrench)
[![License](https://img.shields.io/github/license/amsryq/uwrench?color=007ec6)](https://github.com/amsryq/uwrench/blob/main/LICENSE)

</div>

---

uwrench is a browser extension for [UiTM UFUTURE](ufuture.uitm.edu.my).

It adds small quality-of-life improvements directly to the pages students already use, with per-feature toggles in the extension popup.

## Features

- **Login Redirect**\
  Restores the page you were trying to open after UFuture sends you through the login flow.

- **Folder Pinning**\
  Lets you pin course content folders so they stay at the top of the table.

- **Quick Links**\
  Lets you save course content folders and access them later from a quick links panel on the course list page.

- **Folder Passwords**\
  Adds a remember-password checkbox for protected course content folders and autofills saved passwords.

- **Hide Identifying Info**\
  Hides student identity details and profile photos for screen sharing or recordings.

- **Online Classes panel**\
  Shows online classes on the course list page with filters for active, upcoming, expired, or all classes.

- **Gradebook copy button**\
  Adds a `Copy Q&A` button on gradebook attempt pages to copy the question text and your selected answer.

More planned ideas can be seen in [GOALS.md](./GOALS.md).

## Installation

Official browser store listings (like the Chrome Web Store) aren’t available right now because they cost money. We may add them in the future if enough people request it.

To load it locally:

1. Install dependencies with `bun install`.
2. Build the extension with `bun run build`.
3. Load the generated extension from `.output/chrome-mv3/` in a Chromium-based browser.

For Firefox, use `bun run build:firefox` and load the generated Firefox build.

## Development

- `bun run dev` starts a Chromium development build.
- `bun run dev:firefox` starts a Firefox development build.
- `bun run check` runs type and Svelte checks.
- `bun run zip` creates a distributable archive.

## Notes

### License

uwrench is licensed under the [GNU General Public License v3](http://www.gnu.org/copyleft/gpl.html).

### Disclaimer

uwrench is an unofficial browser extension for UiTM UFuture. We are not affiliated with UiTM. Use it at your own discretion.
