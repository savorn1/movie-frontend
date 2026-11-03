<script setup lang="ts">
import type { HistoryEntry } from '~/composables/useLibrary'
import type { Movie } from '#shared/data/movies'

// A "Continue watching" poster with a ✕ to drop it from the row (with Undo)
const props = defineProps<{ movie: Movie; entry: HistoryEntry }>()

const { seriesProgress, removeFromHistory, restoreHistory } = useLibrary()
const { show } = useToast()

function remove() {
  const removed = removeFromHistory(props.movie.id)
  if (removed) show(`បានដក “${props.movie.title}” ចេញពីបន្តមើល`, { label: 'មិនធ្វើវិញ', run: () => restoreHistory(removed) })
}
</script>

<template>
  <div class="continue">
    <PosterCard
      :movie="movie"
      :progress="{ ep: entry.ep, total: movie.episodes, value: seriesProgress(entry, movie.episodes) }"
    />
    <button type="button" class="remove" :aria-label="`ដក “${movie.title}” ចេញពីបន្តមើល`" @click="remove">
      <AppIcon name="close" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.continue {
  position: relative;
  min-width: 0;
}

.remove {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
}

/* Visible on hover/focus with a mouse; always visible on touch screens */
.continue:hover .remove,
.remove:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .remove {
    opacity: 1;
  }
}

.remove:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
