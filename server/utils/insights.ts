export interface EpisodeStats {
  starts: number
  completes: number
}

export const insightsKey = (seriesId: number) => `series:${seriesId}`

export async function getInsights(seriesId: number) {
  return (await useStorage('insights').getItem<Record<string, EpisodeStats>>(insightsKey(seriesId))) ?? {}
}
