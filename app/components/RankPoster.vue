<script setup lang="ts">
import { toKhmerDigits, type Movie } from '#shared/data/movies'

withDefaults(defineProps<{ movie: Movie; rank: number; width?: number }>(), { width: 104 })
</script>

<template>
  <!-- Signature: large Khmer numerals half-overlapping the poster -->
  <NuxtLink
    :to="`/detail/${movie.id}`"
    class="rank-poster"
    :class="{ podium: rank <= 3 }"
    :style="{ '--w': `${width}px` }"
    :aria-label="`ទី ${rank}: ${movie.title}`"
  >
    <span class="rank" aria-hidden="true">{{ toKhmerDigits(rank) }}</span>
    <span class="poster">
      <span class="note">{{ movie.episode }}</span>
      <img :src="imgSrc(movie.poster, width)" :srcset="imgSrcset(movie.poster, width)" alt="" loading="lazy">
    </span>
  </NuxtLink>
</template>

<style scoped>
.rank-poster {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  padding-left: calc(var(--w) * 0.4);
  border-radius: 10px;
}

.rank {
  position: absolute;
  left: 0;
  bottom: calc(var(--w) * -0.13);
  z-index: 2;
  color: var(--surface, var(--bg-elev));
  font-family: var(--font-display);
  font-size: calc(var(--w) * 0.8);
  font-weight: 400;
  line-height: 1;
  -webkit-text-stroke: 2px var(--text-muted);
  paint-order: stroke fill;
}

.podium .rank {
  color: var(--text-strong);
  -webkit-text-stroke: 3px var(--surface, var(--bg-elev));
}

.poster {
  position: relative;
  display: block;
  width: var(--w);
  aspect-ratio: 5 / 7;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-elev-2);
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s;
}

.rank-poster:hover .poster img {
  transform: scale(1.05);
}

.note {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 14px 6px 4px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8));
  color: #fff;
  font-size: 13px;
  text-align: right;
}
</style>
