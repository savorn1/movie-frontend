<script setup lang="ts">
// 👍/👎 for an episode, shown on the player's end-of-episode overlays (always on a dark backdrop).
const props = defineProps<{ movieId: number; ep: number }>()

const { ratingOf, rate } = useLibrary()
const current = computed(() => ratingOf(props.movieId, props.ep))

function vote(v: 1 | -1) {
  const previous = rate(props.movieId, props.ep, v)
  const now = ratingOf(props.movieId, props.ep) ?? 0
  // The vote is already saved locally; the server total is best-effort
  $fetch('/api/ratings', {
    method: 'POST',
    body: { seriesId: props.movieId, ep: props.ep, vote: now, previous: previous ?? 0 }
  }).catch(() => {})
}
</script>

<template>
  <div class="rating" role="group" aria-label="វាយតម្លៃវគ្គនេះ" @click.stop>
    <span class="q">{{ current ? 'អរគុណ!' : 'តើវគ្គនេះយ៉ាងម៉េច?' }}</span>
    <button type="button" :aria-pressed="current === 1" aria-label="ចូលចិត្ត" @click="vote(1)">👍</button>
    <button type="button" :aria-pressed="current === -1" aria-label="មិនចូលចិត្ត" @click="vote(-1)">👎</button>
  </div>
</template>

<style scoped>
.rating {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.q {
  margin-right: 4px;
  font-size: 14px;
}

button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 40px;
  border-radius: 999px;
  font-size: 20px;
  filter: grayscale(1);
  opacity: 0.75;
  transition: background 0.15s, opacity 0.15s;
}

button:hover {
  background: rgba(255, 255, 255, 0.14);
  opacity: 1;
}

button[aria-pressed='true'] {
  background: rgba(255, 255, 255, 0.25);
  filter: none;
  opacity: 1;
}
</style>
