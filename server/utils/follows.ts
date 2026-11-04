/*
 * Telegram chats following series for new-episode alerts. Kept in VideoLingo's database through
 * movie-api when movieApiEnabled(), else in .data with two indexes so both "notify everyone following
 * series X" and "/stop for this chat" are cheap:
 *   series:<id> -> chat ids following that series
 *   chat:<id>   -> series ids that chat follows
 */
const store = () => useStorage('follows')

async function getList(key: string) {
  return (await store().getItem<number[]>(key)) ?? []
}

export async function addFollow(seriesId: number, chatId: number) {
  if (movieApiEnabled()) {
    await apiCall('POST', '/follows', { seriesId, chatId })
    return
  }
  const chats = await getList(`series:${seriesId}`)
  if (!chats.includes(chatId)) await store().setItem(`series:${seriesId}`, [...chats, chatId])
  const series = await getList(`chat:${chatId}`)
  if (!series.includes(seriesId)) await store().setItem(`chat:${chatId}`, [...series, seriesId])
}

/** Remove a chat from everything it follows; returns the series ids it was following */
export async function removeChat(chatId: number): Promise<number[]> {
  if (movieApiEnabled()) return apiCall<number[]>('DELETE', `/chats/${chatId}/follows`)
  const series = await getList(`chat:${chatId}`)
  for (const id of series) {
    await store().setItem(`series:${id}`, (await getList(`series:${id}`)).filter(c => c !== chatId))
  }
  await store().removeItem(`chat:${chatId}`)
  return series
}

export async function followersOf(seriesId: number): Promise<number[]> {
  if (movieApiEnabled()) return apiCall<number[]>('GET', `/series/${seriesId}/followers`)
  return getList(`series:${seriesId}`)
}

export async function followedBy(chatId: number): Promise<number[]> {
  if (movieApiEnabled()) return apiCall<number[]>('GET', `/chats/${chatId}/follows`)
  return getList(`chat:${chatId}`)
}
