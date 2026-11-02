<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie; current?: number; compact?: boolean }>()

// Locked episodes still open the watch page, which shows the unlock wall in context
const { canWatch } = useLibrary()
const locked = (ep: number) => !canWatch(props.movie, ep)

// Long series are split into ranges of 30 so the grid stays scannable
const RANGE = 30
const ranges = computed(() => {
  const out: [number, number][] = []
  for (let s = 1; s <= props.movie.episodes; s += RANGE) out.push([s, Math.min(s + RANGE - 1, props.movie.episodes)])
  return out
})
const rangeIndex = ref(Math.floor(((props.current ?? 1) - 1) / RANGE))
watch(() => props.current, c => c && (rangeIndex.value = Math.floor((c - 1) / RANGE)))

const visible = computed(() => {
  const [a, b] = ranges.value[rangeIndex.value] ?? [1, props.movie.episodes]
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
})
</script>

<template>
  <div class="episodes" :class="{ compact }">
    <div v-if="ranges.length > 1" class="ranges" role="group" aria-label="ជួរវគ្គ">
      <button
        v-for="(r, i) in ranges"
        :key="i"
        type="button"
        :aria-pressed="rangeIndex === i"
        @click="rangeIndex = i"
      >
        {{ r[0] === r[1] ? kh(r[0]) : `${kh(r[0])}–${kh(r[1])}` }}
      </button>
    </div>
    <ol class="grid">
      <li v-for="ep in visible" :key="ep">
        <NuxtLink
          :to="`/watch/${movie.id}/${ep}`"
          :class="{ locked: locked(ep), current: ep === current }"
          :aria-current="ep === current ? 'true' : undefined"
          :aria-label="locked(ep) ? `វគ្គ ${kh(ep)} ត្រូវការ VIP` : `វគ្គ ${kh(ep)}`"
        >
          <span v-if="ep === current" class="eq" aria-hidden="true"><i /><i /><i /></span>
          {{ kh(ep) }}
          <AppIcon v-if="locked(ep)" name="lock" :size="12" class="lock" />
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ranges {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.ranges button {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
}

.ranges button[aria-pressed='true'] {
  background: var(--text-strong);
  color: var(--bg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.compact .grid {
  grid-template-columns: repeat(5, 1fr);
}

.grid a {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border-radius: 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  font-weight: 600;
}

.grid a:hover {
  background: var(--bg-hover);
}

.grid a.current {
  background: var(--text-strong);
  border-color: var(--text-strong);
  color: var(--bg);
}

.grid a.locked {
  color: var(--text-muted);
}

.lock {
  position: absolute;
  top: 4px;
  right: 4px;
  color: var(--accent-text);
}

/* "Now playing" bars on the current episode */
.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.eq i {
  width: 3px;
  background: currentColor;
  border-radius: 1px;
  animation: eq 0.9s ease-in-out infinite;
}

.eq i:nth-child(2) {
  animation-delay: -0.3s;
}

.eq i:nth-child(3) {
  animation-delay: -0.6s;
}

@keyframes eq {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eq i {
    height: 10px;
    animation: none;
  }
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
