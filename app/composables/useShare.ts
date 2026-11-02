export function useShare() {
  const { show } = useToast()

  // System share sheet where available, otherwise copy the link and say so.
  async function share(title: string, path: string) {
    const url = new URL(path, window.location.origin).toString()
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      show('បានចម្លងតំណរួចហើយ')
    } catch {
      show('មិនអាចចម្លងតំណបានទេ')
    }
  }

  return { share }
}
