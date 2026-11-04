# RuengFlix

A Nuxt 4 front end for watching Khmer short-drama series: a binge player that moves straight to the next episode, a vertical Shorts feed, VIP episode unlocks, and Telegram alerts when a followed series gets a new episode.

## Run it

```bash
npm install
npm run dev        # http://localhost:3010
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
- **Production:** set `NUXT_PUBLIC_SITE_URL` to your real domain. Crawlers need absolute URLs, and the default is `http://localhost:3010`.
- **Khmer in preview images:** image generators such as satori can't lay out Khmer script, so any preview image with Khmer text should be rendered by a browser, as `og-default.png` was.
- **Checking a preview:** after deploying, check with Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/), which also refreshes its cache. Telegram caches previews too; [@WebpageBot](https://t.me/WebpageBot) refreshes them.

## Engagement

- **Share a moment:** the Share button in the player copies or shares `/watch/<id>/<ep>?t=<seconds>`. Opening that link starts playback at that second, overriding the viewer's own saved position.
- **Episode ratings:** a 👍/👎 prompt appears at the end of every episode. The vote is saved in the browser and sent to `POST /api/ratings`, and `GET /api/ratings/<seriesId>` returns per-episode totals. Votes are anonymous and limited to 30 per minute per IP address, which slows spamming but doesn't stop it. Tie votes to accounts once login exists.
- **"For you" row on Home:** it scores categories from the viewer's history, saves, follows and ratings, all inside their browser, then suggests popular series in their top category that they haven't started yet.

## Backend: movie-api

RuengFlix's backend is **movie-api** (NestJS, `../../nest/movie-api`). It reads and writes **VideoLingo's PostgreSQL**, so content is still managed in **videolingo-web** (VideoLingo's admin portal), and VideoLingo's Flyway migrations own the tables.

```
browser → RuengFlix (Nuxt) → movie-api (Nest, Prisma) → VideoLingo's PostgreSQL ← VideoLingo (Java) ← videolingo-web
```

| In videolingo-web | On RuengFlix |
|---|---|
| A **Public** collection with **Show on RuengFlix** switched on (Edit collection → RuengFlix section) | A series |
| The collection's videos that are enabled, Public, and not archived or in the trash, in collection order | Episodes 1, 2, 3… |
| A video scheduled with a publish time | The "វគ្គ N ចេញ…" countdown on the series page, and the episode appears when VideoLingo releases it |
| Cover image, plus banner and vertical image URLs in the RuengFlix section | Poster, hero banner, Shorts artwork |
| VIP and free episodes, category, status, recap length, Latin search words, genres, country, year | The same fields on the site |
| The video's published subtitle track in Khmer (`km`), or else its default published track | Khmer subtitles in the player |

**Connect it:**

```bash
NUXT_MOVIE_API_BASE=http://localhost:3020                # movie-api's origin (server-side only)
NUXT_MOVIE_API_TOKEN=<same value as MOVIE_API_TOKEN>     # movie-api refuses every call without it
NUXT_PUBLIC_VIDEOLINGO_ADMIN_URL=https://admin.example   # optional: linked from /admin
```

With movie-api connected, these all come from VideoLingo's database:
- series and episodes;
- 👍/👎 votes;
- plays (Insights);
- problem reports;
- Telegram follows;
- new-episode alert counts.

Only RuengFlix's server calls movie-api, never browsers, so RuengFlix's per-IP rate limits still apply.

How it behaves:
- **Locked episodes:** movie-api never returns a video or subtitle link for a locked VIP episode.
- **Expiring links:** stored files get signed links, using the same S3 settings as VideoLingo; they expire after `MEDIA_URL_TTL_MINUTES` (180 by default).
- **Caching:** the catalog is cached for 30 seconds, so a newly released episode shows up within about a minute.
- **If movie-api goes down:** RuengFlix keeps serving the last catalog it fetched. Votes and reports fail with 502 until movie-api is back.
- **Subtitles:** they're passed through RuengFlix (`/subtitles/<series>/<ep>.vtt`).
- **New-episode alerts:** when a series has more episodes than last seen, its Telegram followers get one alert for the newest episode, and the server logs `[alerts] <title> (#id): episode N is out`. The first look at a series only records the count. movie-api hands each new episode to exactly one caller, so several RuengFlix instances never send the same alert twice.
- **Time zones:** VideoLingo stores local times. movie-api converts them (`DB_TIME_ZONE`) and sends real UTC instants.
- **Existing data:** data already in `.data` is not copied over.

**Without `NUXT_MOVIE_API_BASE`**, RuengFlix uses the built-in sample series, with viewer data in `.data` on this server. This is useful for local development and the browser tests.

## Admin dashboard (`/admin`)

RuengFlix's own admin shows viewer data: Insights and Reports. Series and episodes are edited in videolingo-web (see "Backend: movie-api").

```bash
NUXT_ADMIN_PASSWORD=<a strong password>
NUXT_SESSION_SECRET=<32+ random characters>   # encrypts the admin session cookie
NUXT_TELEGRAM_ADMIN_CHAT=<chat id>            # optional: problem reports go to this Telegram chat
```

Without the first two, `/admin` shows "not configured" and every admin API answers 503. Admin is never open by default.

The session is an encrypted, HTTP-only, SameSite=Strict cookie that lasts 12 hours. Login attempts are limited to 10 per 15 minutes per IP address.

| Tab | What it does |
|---|---|
| **ការយល់ដឹង** (Insights) | Per episode: how many devices started it, how many finished it (90%), and **% continue**, the share of finishers who started the next episode. The biggest drop-off is highlighted. |
| **របាយការណ៍** (Reports) | Viewer problem reports (video, subtitles, audio, other) with the exact second, a link to watch that moment, and Resolve with Undo. |

Notes:
- **Storage:** with movie-api connected, Insights and Reports come from VideoLingo's database. Without it, Nitro storage (`catalog`, `insights`, `reports`, `ratings`, `follows`) uses the `fs` driver in `.data`. On a host without a persistent disk, either connect movie-api or switch these stores to Redis in `nuxt.config.ts`.
- **Insights accuracy:** insight events are anonymous and sent once per device per episode, so they count devices, not people.

## Player extras

| Feature | Where |
|---|---|
| Skip recap | Shown at the start of episodes 2+ for the series' recap length (set in VideoLingo) |
| Picture-in-picture | ⋯ menu (Chrome, Edge, Safari, Android) |
| Sleep timer | ⋯ menu: stop at the end of this episode, or pause after 15/30/60 minutes |
| Report a problem | ⋯ menu; saved for Admin and sent to `NUXT_TELEGRAM_ADMIN_CHAT` |
| Share this moment | ⋯ menu |

Other viewer features:
- **Continue watching:** each card has ✕ to remove that series from the row, with Undo.
- **Browse filters:** ongoing or completed, short (under 20 episodes) or long, and sort by most liked.

## Episode videos

With VideoLingo connected, episodes play the videos uploaded or imported there, using VideoLingo's signed links.

The sample series fall back to public 10-second MP4 test clips, plus an HLS test stream for every 5th episode. Their Khmer subtitles come from [server/routes/subtitles/[id]/[file].ts](server/routes/subtitles/%5Bid%5D/%5Bfile%5D.ts).

`episodeSource()` in [shared/data/movies.ts](shared/data/movies.ts) picks the link and detects HLS from the `.m3u8` extension. HLS plays natively in Safari and current Chrome; other browsers load `hls.js` on demand.

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

A VIP series' first episodes are free; how many is set per series in VideoLingo ("Free episodes", default 3). The wall offers two options: a one-time unlock of the whole series (`SERIES_UNLOCK_PRICE`), or the monthly VIP plan.

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

4. Alerts go out **automatically** when VideoLingo releases an episode, whether published right away or at its scheduled time (see "Backend: movie-api"). To send one by hand, for example for the sample series:

   ```bash
   curl -X POST "$NUXT_PUBLIC_SITE_URL/api/notify" \
     -H "Authorization: Bearer $NUXT_NOTIFY_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"seriesId": 12, "ep": 9}'
   # → {"followers": 40, "sent": 39, "removed": 1, "failed": 0}
   ```

   People who have blocked the bot are removed automatically (`removed`).

How it works: the site's **Follow** button opens `t.me/<bot>?start=s<seriesId>`, and the bot then records that chat as a follower. In the chat, `/list` shows followed series and `/stop` turns off all alerts.

Followers are stored in VideoLingo's database through movie-api when it is connected, and otherwise in `.data/follows`, which is ignored by git.

Without `NUXT_PUBLIC_TELEGRAM_BOT`, the Follow button still works, but it only saves the series in the browser and shows it under "ខ្ញុំ".
