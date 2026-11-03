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

## Link previews and search engines

Every page calls `usePageMeta()` ([app/composables/usePageMeta.ts](app/composables/usePageMeta.ts)). It sets the title, description, canonical URL and the Open Graph and Twitter tags that Telegram, Facebook and Messenger read when a link is shared.

- **Series and episode pages** use that series' artwork at 1200×630, with the Khmer title and episode count ("ឈោងយកផ្កាយ · ៣១ វគ្គ"). Series pages also carry `TVSeries` structured data for search engines.
- **Other pages** use [public/og-default.png](public/og-default.png).
- **Me and Search** are `noindex`, so search engines leave them out.
- **Production:** set `NUXT_PUBLIC_SITE_URL` to your real domain. Crawlers need absolute URLs, and the default is `http://localhost:3000`.
- **Khmer in preview images:** image generators such as satori can't lay out Khmer script, so any preview image with Khmer text should be rendered by a browser, as `og-default.png` was.
- **Checking a preview:** after deploying, check with Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/), which also refreshes its cache. Telegram caches previews too; [@WebpageBot](https://t.me/WebpageBot) refreshes them.

## Engagement

- **Share a moment:** the Share button in the player copies or shares `/watch/<id>/<ep>?t=<seconds>`. Opening that link starts playback at that second, overriding the viewer's own saved position.
- **Episode ratings:** a 👍/👎 prompt appears at the end of every episode. The vote is saved in the browser and sent to `POST /api/ratings`, and `GET /api/ratings/<seriesId>` returns per-episode totals. Votes are anonymous and limited to 30 per minute per IP address, which slows spamming but doesn't stop it. Tie votes to accounts once login exists.
- **"For you" row on Home:** it scores categories from the viewer's history, saves, follows and ratings, all inside their browser, then suggests popular series in their top category that they haven't started yet.

## Admin dashboard (`/admin`)

The series catalog is owned by the server. It's stored in Nitro storage `catalog` (`.data/catalog`) and seeded with the sample series on first run. Pages read it through `useCatalog()`, and it arrives with the first page load.

**Set up:**

```bash
NUXT_ADMIN_PASSWORD=<a strong password>
NUXT_SESSION_SECRET=<32+ random characters>   # encrypts the admin session cookie
NUXT_TELEGRAM_ADMIN_CHAT=<chat id>            # optional: problem reports go to this Telegram chat
```

Without the first two, `/admin` shows "not configured" and every admin API answers 503. Admin is never open by default.

The session is an encrypted, HTTP-only, SameSite=Strict cookie that lasts 12 hours. Login attempts are limited to 10 per 15 minutes per IP address.

| Tab | What it does |
|---|---|
| **រឿង** (Series) | Search, toggle VIP, edit details (title, Latin search keywords, category, status, free episodes, recap length), add or delete a series. **ចេញវគ្គ N** publishes the next episode: paste its `.m3u8`/`.mp4` link, and optionally alert Telegram followers. |
| **ការយល់ដឹង** (Insights) | Per episode: how many devices started it, how many finished it (90%), and **% continue**, the share of finishers who started the next episode. The biggest drop-off is highlighted. |
| **របាយការណ៍** (Reports) | Viewer problem reports (video, subtitles, audio, other) with the exact second, a link to watch that moment, and Resolve with Undo. |

Notes:
- **Storage:** Nitro storage (`catalog`, `insights`, `reports`, `ratings`, `follows`) uses the `fs` driver. On a host without a persistent disk, switch them all to Redis or another key-value store in `nuxt.config.ts`.
- **Insights accuracy:** insight events are anonymous and sent once per device per episode, so they count devices, not people.

## Player extras

| Feature | Where |
|---|---|
| Skip recap | Shown at the start of episodes 2+ for `recapSeconds` (set per series in Admin) |
| Picture-in-picture | ⋯ menu (Chrome, Edge, Safari, Android) |
| Sleep timer | ⋯ menu: stop at the end of this episode, or pause after 15/30/60 minutes |
| Report a problem | ⋯ menu; saved for Admin and sent to `NUXT_TELEGRAM_ADMIN_CHAT` |
| Share this moment | ⋯ menu |

Other viewer features:
- **Continue watching:** each card has ✕ to remove that series from the row, with Undo.
- **Browse filters:** ongoing or completed, short (under 20 episodes) or long, and sort by most liked.

## Episode videos

Each episode's video link is set when it's published from **Admin → ចេញវគ្គ N**, or for episode 1 when the series is created. The link is stored in the series' `sources`. Episodes without a link fall back to public 10-second MP4 test clips, plus an HLS test stream for every 5th episode. `episodeSource()` in [shared/data/movies.ts](shared/data/movies.ts) makes that choice, and detects HLS from the `.m3u8` extension. HLS plays natively in Safari and current Chrome; other browsers load `hls.js` on demand. The sample Khmer subtitles come from [server/routes/subtitles/[id]/[file].ts](server/routes/subtitles/%5Bid%5D/%5Bfile%5D.ts); replace them with real `.vtt` files.

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
