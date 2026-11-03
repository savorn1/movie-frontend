import type { LikeTotals } from '#shared/data/movies'

/** 👍/👎 totals per series (all episodes summed), for Browse's "most liked" sort */
export default defineEventHandler(async () => {
  const store = useStorage('ratings')
  const out: Record<number, LikeTotals> = {}
  for (const key of await store.getKeys('series')) {
    const id = Number(key.split(':').pop())
    const perEp = (await store.getItem<Record<string, LikeTotals>>(key)) ?? {}
    out[id] = Object.values(perEp).reduce((t, e) => ({ up: t.up + e.up, down: t.down + e.down }), { up: 0, down: 0 })
  }
  return out
})
