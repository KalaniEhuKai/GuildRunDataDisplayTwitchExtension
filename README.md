# GuildRunDataDisplayTwitchExtension

An interactive, non-intrusive **Video Overlay extension** for Twitch streams that displays live Guild Run game data (Act, Floor, Relics, Party Heroes, HP, Gold/Shards) streamed from the **Twitch Local Game Data Bridge**.

---

## Features

- **Video Overlay HUD**: Sleek floating compact pill badge (`Act 2 · Floor 4 · 💎 120 Shards`) in the top-right corner of the video stream.
- **Expandable Live Drawer**: Streamers and viewers click to expand/collapse full hero health bars, levels, active relics list, and run seed.
- **Auto Channel Authorization**: Uses the official Twitch Extension SDK (`window.Twitch.ext.onAuthorized`) to automatically determine the broadcaster channel ID.
- **Zero-Config Setup**: Automatically queries `https://twitch-local-game-data-bridge.kalani-ehu-kai.workers.dev/data/:channelId/guild-run/data`.

---

## File Structure

```text
GuildRunDataDisplayTwitchExtension/
├── overlay.html          Video Overlay UI (loaded directly on video stream)
├── overlay.js            Overlay controller & live polling logic
├── style.css             Twitch-native glassmorphism UI styles
├── config.html           Streamer configuration testing view
├── config.js             Config test controller
├── manifest.json         Official Twitch Extension Manifest
└── README.md             Developer Documentation
```

---

## Testing in Browser (Standalone Preview)

You can preview and test `overlay.html` in your browser outside Twitch by passing a `channelId` query parameter in the URL:

```text
file:///path/to/GuildRunDataDisplayTwitchExtension/overlay.html?channelId=76561198040573729
```

---

## Uploading to Twitch Developer Console

1. Log into [dev.twitch.tv/console/extensions](https://dev.twitch.tv/console/extensions).
2. Click **Create Extension** → **Extension Type: Video Overlay**.
3. Zip all files in `GuildRunDataDisplayTwitchExtension/` (`overlay.html`, `overlay.js`, `style.css`, `config.html`, `config.js`, `manifest.json`).
4. Upload the zip file under the **Files** section in Twitch Developer Console.
5. Set your Extension state to **In Testing** or submit for review.
