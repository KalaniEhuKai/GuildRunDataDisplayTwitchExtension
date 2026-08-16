# GuildRunDataDisplayTwitchExtension

An interactive **Video Overlay extension** for Twitch streams that displays live Guild Run game data (Act, Floor, Relics, etc.). Uses the **Twitch Local Game Data Bridge** to get access to the data..

---

## Features & Hover-Zone UX

- **Top-Left Hover Zone (`Relics`)**: Moving your mouse into the top-left region fetches game data and opens an active Relics popover showing acquired relics.
- **Middle-Right Hover Zone (`Current Challenge`)**: Moving your mouse into the middle-right region fetches game data and displays current challenge stats (Act, Floor, Deaths).
- **Unobstructed Video Stream**: Interactive zone boxes are 100% transparent with thin colored borders. Zero stream content visual obstruction when idle.
- **Event-Driven Data Fetching**: Data is fetched from the data bridge *only* when the viewer hovers into an interactive zone (`mouseenter`).
- **Single Database Source (`guildrundatabase.js`)**: Single source of truth database file loaded synchronously via `<script src="guildrundatabase.js"></script>`, eliminating async fetch race conditions and local file CORS restrictions.

---

## File Structure

```text
GuildRunDataDisplayTwitchExtension/
├── overlay.html          Video Overlay UI (loaded directly on video stream)
├── overlay.js            Overlay controller & event-driven fetch logic
├── style.css             Twitch-native glassmorphism hover-zone UI styles
├── guildrundatabase.js   Single database source of truth for relics, heroes, and metadata
├── config.html           Streamer configuration testing view
├── config.js             Config test controller
├── manifest.json         Official Twitch Extension Manifest
├── LICENSE               GNU General Public License v3.0
└── README.md             Developer Documentation
```

---

## Database Management & Scraper Tool

To re-scrape [https://guildrun.org/database/relics/](https://guildrun.org/database/relics/) and update `guildrundatabase.js`, run:

```bash
node tools/scrape-relics.js
```

---

## Testing in Browser (Standalone Preview)

You can preview and test `overlay.html` in your browser outside Twitch by passing a `channelId` query parameter in the URL:

```text
file:///path/to/GuildRunDataDisplayTwitchExtension/overlay.html?channelId=48715826
```

1. Hover over the **Top-Left Zone**: Triggers API fetch and displays Relics popover.
2. Hover over the **Middle-Right Zone**: Triggers API fetch and displays Challenge & Party popover.

---

## Uploading to Twitch Developer Console

1. Log into [dev.twitch.tv/console/extensions](https://dev.twitch.tv/console/extensions).
2. Click **Create Extension** → **Extension Type: Video Overlay**.
3. Zip all files in `GuildRunDataDisplayTwitchExtension/` (`overlay.html`, `overlay.js`, `style.css`, `guildrundatabase.js`, `config.html`, `config.js`, `manifest.json`).
4. Upload the zip file under the **Files** section in Twitch Developer Console.
5. Set your Extension state to **In Testing** or submit for review.
