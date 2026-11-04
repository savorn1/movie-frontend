/*
 * Sample Khmer subtitle track (WebVTT) so captions can be tested end to end.
 * Replace with real .vtt files per episode alongside the video source.
 */
const lines = [
  '[អក្សររត់គំរូ] តើអ្នកនឹងទៅណា?',
  'ខ្ញុំត្រូវតែរកការពិតឱ្យឃើញ។',
  'រឿងនេះមិនទាន់ចប់ទេ…',
  'ចាំមើលវគ្គបន្ទាប់!'
]

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const ep = Number(getRouterParam(event, 'file')?.replace(/\.vtt$/, ''))

  // movie-api series: pass its published subtitles through (404 when it has none or the episode is locked)
  if (movieApiEnabled()) {
    const vtt = await apiSubtitles(id, ep)
    if (!vtt) throw createError({ statusCode: 404 })
    setHeader(event, 'Content-Type', 'text/vtt; charset=utf-8')
    setHeader(event, 'Cache-Control', 'public, max-age=300')
    return vtt
  }

  const movie = await findSeries(id)
  if (!movie || !Number.isInteger(ep) || ep < 1 || ep > movie.episodes) {
    throw createError({ statusCode: 404 })
  }

  const ts = (s: number) => `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.000`
  const cues = [`${movie.title} · វគ្គ ${ep}`, ...lines]
    .map((text, i) => `${i + 1}\n${ts(i * 2.5 | 0)} --> ${ts((i * 2.5 | 0) + 2)}\n${text}`)
    .join('\n\n')

  setHeader(event, 'Content-Type', 'text/vtt; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return `WEBVTT\n\n${cues}\n`
})
