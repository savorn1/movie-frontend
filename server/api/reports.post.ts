/*
 * "Report a problem" from the player. Stored for /admin and, when NUXT_TELEGRAM_ADMIN_CHAT is
 * set, sent to that Telegram chat so broken episodes get noticed quickly.
 *   POST { seriesId, ep, reason: 'video' | 'subtitles' | 'audio' | 'other', note?, time? }
 */
export default defineEventHandler(async (event) => {
  rateLimit(event, 'reports', 5, 10 * 60_000)
  const body = await readBody<{ seriesId?: number; ep?: number; reason?: string; note?: string; time?: number }>(event)
  const movie = await findSeries(Number(body?.seriesId))
  const ep = Number(body?.ep)
  const reason = body?.reason as ReportReason
  if (!movie || !Number.isInteger(ep) || ep < 1 || ep > movie.episodes || !(reason in REPORT_REASONS)) {
    throw createError({ statusCode: 400, message: 'Expected { seriesId, ep, reason, note?, time? }' })
  }

  const report = await addReport({
    seriesId: movie.id,
    ep,
    reason,
    note: String(body?.note ?? '').trim().slice(0, 300),
    time: Math.max(0, Math.floor(Number(body?.time) || 0))
  })

  const { telegramBotToken, telegramAdminChat, public: pub } = useRuntimeConfig(event)
  if (telegramBotToken && telegramAdminChat) {
    const site = pub.siteUrl.replace(/\/$/, '')
    const lines = [
      `⚠️ <b>របាយការណ៍បញ្ហា</b>: ${escapeHtml(REPORT_REASONS[reason])}`,
      `${escapeHtml(movie.title)} · វគ្គ ${ep} · ${Math.floor(report.time / 60)}:${String(report.time % 60).padStart(2, '0')}`,
      report.note ? `“${escapeHtml(report.note)}”` : ''
    ].filter(Boolean)
    // A Telegram outage must not lose the report, which is already saved
    await tgSend(Number(telegramAdminChat), lines.join('\n'), [
      { text: '▶️ មើលចំណុចនេះ', url: `${site}/watch/${movie.id}/${ep}?t=${report.time}` },
      { text: 'បើក Admin', url: `${site}/admin` }
    ]).catch(() => {})
  }

  setResponseStatus(event, 201)
  return { ok: true }
})
