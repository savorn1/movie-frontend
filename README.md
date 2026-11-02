# RuengFlix

A Nuxt 4 front end for watching Khmer short-drama series: a binge player that moves straight to the next episode, a vertical Shorts feed, VIP episode unlocks, and Telegram alerts when a followed series gets a new episode.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && node .output/server/index.mjs   # production
```

## Appearance

There are three settings: **Automatic** (the default, follows the device), **Light** and **Dark**. People can change it from the sun/moon button in the header or from the "រូបរាង" (Appearance) section on the Me page.

The choice is saved in a `theme` cookie, so the server renders an explicit choice directly. An inline script in `<head>` ([app/plugins/theme.ts](app/plugins/theme.ts)) resolves "Automatic" before the first paint, so the page never flashes the wrong theme. All theme colours are tokens in [app/assets/css/main.css](app/assets/css/main.css) under `:root` (dark) and `:root[data-theme='light']`.

## Phones, slow networks and in-app browsers

- **Data saver** (Me page; Automatic / On / Off). Automatic turns on when the phone reports Data Saver, mobile data or a slow network; this check only works in Chrome on Android, and other browsers stay off. While it's on, the next episode isn't preloaded, HLS starts at its lowest quality, and the hero uses half-size images.
- **In-app browsers** (Facebook, Messenger, Instagram, Telegram on Android, LINE, TikTok). A banner offers "Open in Chrome" on Android, or explains "⋯ → Open in Safari" on iPhone. If full screen is blocked, the player fills the viewport with CSS instead.
- **Install as an app**: [public/manifest.webmanifest](public/manifest.webmanifest), icons in `public/icons/`, and [public/sw.js](public/sw.js). The service worker runs only in production builds. It caches app files and the last 30 visited pages, and shows [public/offline.html](public/offline.html) when offline. Video, `/api` and subtitles always come from the network. When you change caching, bump `VERSION` in `sw.js`.
- **Latin search**: typing "sneha", "summer love" or "kbach kun" finds Khmer titles. The keywords live in `latinTitles` and `latinAliases` in [shared/data/movies.ts](shared/data/movies.ts); add them for every new title.
- **Khmer digits** in display text via the auto-imported `kh()` helper. Prices, playback speed and the player clock keep Western digits.
- **New-episode badges**: when someone follows a series, the site stores its episode count. Episodes added after that show as "វគ្គថ្មី" on posters and as a count on Me, until the series is opened again.

## Episode videos

Episode URLs come from one function: `episodeSource()` in [shared/data/movies.ts](shared/data/movies.ts). Until real content exists it returns public 10-second MP4 test clips, plus an HLS test stream for every 5th episode.

To use your own videos, have it return your HLS (`.m3u8`) or MP4 URL for each episode, and a WebVTT subtitle URL. HLS plays natively in Safari and current Chrome; other browsers load `hls.js` on demand. The sample Khmer subtitles come from [server/routes/subtitles/[id]/[file].ts](server/routes/subtitles/%5Bid%5D/%5Bfile%5D.ts); replace them with real `.vtt` files.

## Player

| Input | Action |
|---|---|
| Space / K | Play / pause |
| ← → / J L | Back / forward 10 s |
| N / P | Next / previous episode |
| `<` `>` | Slower / faster |
| C | Khmer subtitles on/off |
| M | Mute |
| F | Full screen |
| Phone: swipe up / down | Next / previous episode |
| Phone: double-tap left / right | Back / forward 10 s |

At the end of an episode a 3-second countdown starts the next one, and it can be cancelled. When the next episode is VIP, the unlock wall appears over the last frame instead.

Watch position is saved every few seconds, so "Continue watching" resumes at the exact second. The playback speed and the subtitle setting are remembered.

## VIP unlocks

Episodes 1–3 of a VIP series are free (`FREE_EPISODES`). The wall offers two options: a one-time unlock of the whole series (`SERIES_UNLOCK_PRICE`), or the monthly VIP plan.

KHQR payment isn't connected yet. In `npm run dev` the wall shows a **"សាកល្បងដោះសោ (dev)"** button for testing the unlocked flow; it doesn't appear in production builds.

## Telegram new-episode alerts

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its token and username.
2. Set these environment variables (in `.env` for local development):

   ```bash
   NUXT_TELEGRAM_BOT_TOKEN=123456:ABC...
   NUXT_PUBLIC_TELEGRAM_BOT=RuengFlixBot              # username, without @
   NUXT_TELEGRAM_WEBHOOK_SECRET=<random string>
   NUXT_NOTIFY_SECRET=<another random string>
   NUXT_PUBLIC_SITE_URL=https://your-domain.example
   ```

3. Point the bot at the site. This needs a public HTTPS URL:

   ```bash
   curl "https://api.telegram.org/bot$NUXT_TELEGRAM_BOT_TOKEN/setWebhook?url=$NUXT_PUBLIC_SITE_URL/api/telegram/webhook&secret_token=$NUXT_TELEGRAM_WEBHOOK_SECRET"
   ```

4. When a new episode is published, notify that series' followers:

   ```bash
   curl -X POST "$NUXT_PUBLIC_SITE_URL/api/notify" \
     -H "Authorization: Bearer $NUXT_NOTIFY_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"seriesId": 12, "ep": 9}'
   # → {"followers": 40, "sent": 39, "removed": 1, "failed": 0}
   ```

   People who have blocked the bot are removed automatically (`removed`).

How it works: the site's **Follow** button opens `t.me/<bot>?start=s<seriesId>`, and the bot then records that chat as a follower. In the chat, `/list` shows followed series and `/stop` turns off all alerts.

Followers are stored with Nitro storage in `.data/follows`, which is ignored by git. On a host without a persistent disk, switch the `follows` storage driver in `nuxt.config.ts` to Redis or a key-value store.

Without `NUXT_PUBLIC_TELEGRAM_BOT`, the Follow button still works, but it only saves the series in the browser and shows it under "ខ្ញុំ".
