// Two indexes so both "notify everyone following series X" and "/stop for this chat" are cheap.
//   series:<id> -> chat ids following that series
//   chat:<id>   -> series ids that chat follows
const store = () => useStorage('follows')

async function getList(key: string) {
  return (await store().getItem<number[]>(key)) ?? []
}

export async function addFollow(seriesId: number, chatId: number) {
  const chats = await getList(`series:${seriesId}`)
  if (!chats.includes(chatId)) await store().setItem(`series:${seriesId}`, [...chats, chatId])
  const series = await getList(`chat:${chatId}`)
  if (!series.includes(seriesId)) await store().setItem(`chat:${chatId}`, [...series, seriesId])
}

export async function removeFollow(seriesId: number, chatId: number) {
  await store().setItem(`series:${seriesId}`, (await getList(`series:${seriesId}`)).filter(c => c !== chatId))
  await store().setItem(`chat:${chatId}`, (await getList(`chat:${chatId}`)).filter(s => s !== seriesId))
}

/** Remove a chat from everything it follows; returns the series ids it was following */
export async function removeChat(chatId: number) {
  const series = await getList(`chat:${chatId}`)
  for (const id of series) {
    await store().setItem(`series:${id}`, (await getList(`series:${id}`)).filter(c => c !== chatId))
  }
  await store().removeItem(`chat:${chatId}`)
  return series
}

export const followersOf = (seriesId: number) => getList(`series:${seriesId}`)
export const followedBy = (chatId: number) => getList(`chat:${chatId}`)
