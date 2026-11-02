/** Save / unsave a series with a toast that offers Undo (used by detail, watch and Shorts). */
export function useSaveToggle() {
  const { isFavorite, toggleFavorite } = useLibrary()
  const { show } = useToast()

  function toggleSave(id: number) {
    toggleFavorite(id)
    show(isFavorite(id) ? 'បានរក្សាទុកក្នុង “ខ្ញុំ”' : 'បានដកចេញពីចំណូលចិត្ត', {
      label: 'មិនធ្វើវិញ',
      run: () => toggleFavorite(id)
    })
  }

  return { isSaved: isFavorite, toggleSave }
}
