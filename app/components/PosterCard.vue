<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

defineProps<{ movie: Movie; eager?: boolean; progress?: { ep: number; total: number; value?: number } }>()

// Images that finished before hydration never fire `load`, so check `complete` on mount.
const { newEpisodes } = useLibrary()
const hydrated = useHydrated()

const img = ref<HTMLImageElement>()
const loaded = ref(false)
onMounted(() => {
  if (img.value?.complete && img.value.naturalWidth) loaded.value = true
})
</script>

<template>
  <NuxtLink :to="progress ? `/watch/${movie.id}/${progress.ep}` : `/detail/${movie.id}`" class="poster">
    <div class="cover" :class="{ shimmer: !loaded }">
      <span v-if="movie.vip" class="vip-badge corner">VIP</span>
      <span v-if="hydrated && newEpisodes(movie.id)" class="new-badge">វគ្គថ្មី</span>
      <span v-if="!progress" class="note">{{ movie.episode }}</span>
      <img
        ref="img"
        :src="movie.poster"
        alt=""
        width="300"
        height="420"
        :class="{ loaded }"
        :loading="eager ? 'eager' : 'lazy'"
        decoding="async"
        @load="loaded = true"
      >
      <span class="play"><AppIcon name="play" :size="22" /></span>
      <div v-if="progress" class="progress" aria-hidden="true">
        <span :style="{ width: `${Math.min(100, (progress.value ?? progress.ep / progress.total) * 100)}%` }" />
      </div>
    </div>
    <div class="title">{{ movie.title }}</div>
    <div v-if="progress" class="sub">បានមើលដល់វគ្គ {{ kh(progress.ep) }} / {{ kh(progress.total) }}</div>
  </NuxtLink>
</template>

<style scoped>
.poster {
  display: block;
  min-width: 0;
  border-radius: 10px;
}

.cover {
  position: relative;
  aspect-ratio: 5 / 7;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-elev-2);
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s, transform 0.35s;
}

.cover img.loaded {
  opacity: 1;
}

.poster:hover img {
  transform: scale(1.05);
}

.note {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 20px 8px 6px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8));
  color: #fff;
  font-size: 13px;
  text-align: right;
}

.corner {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}

.new-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  padding: 0 7px;
  border-radius: 5px;
  background: var(--signal);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
}

.play {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.poster:hover .play,
.poster:focus-visible .play {
  opacity: 1;
}

.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
}

.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
}

/* Two lines: long Khmer titles lose their meaning when cut to one */
.title {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.poster:hover .title {
  color: var(--text-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.sub {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
