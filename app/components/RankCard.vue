<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

defineProps<{ movie: Movie; rank: number }>()
</script>

<template>
  <article class="card">
    <RankPoster :movie="movie" :rank="rank" :width="104" class="rp" />
    <div class="info">
      <NuxtLink :to="`/detail/${movie.id}`" class="title">
        <strong>{{ movie.title }}</strong>
      </NuxtLink>
      <p class="meta">
        <span v-if="movie.vip" class="vip-badge">VIP</span>
        {{ kh(movie.year) }}<span class="slash">/</span>{{ movie.region }}<span class="slash">/</span>{{ movie.genres.join(', ') }}
      </p>
      <div class="actions">
        <NuxtLink :to="`/watch/${movie.id}/1`" class="btn btn-primary">
          <AppIcon name="play" :size="14" />ចាក់
        </NuxtLink>
        <NuxtLink :to="`/detail/${movie.id}`" class="btn btn-outline">ព័ត៌មានលម្អិត</NuxtLink>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  gap: 16px;
  padding: 16px 16px 16px 8px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.title {
  color: var(--text-strong);
  font-size: 16px;
}

.title strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.title:hover strong {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.meta {
  display: -webkit-box;
  margin: 6px 0 12px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 13px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta .vip-badge {
  margin-right: 6px;
}

.slash {
  margin: 0 6px;
  opacity: 0.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 480px) {
  .card {
    gap: 12px;
    padding: 12px 12px 12px 4px;
  }

  .rp {
    --w: 88px !important;
  }

  .btn {
    min-height: 36px;
    padding: 0 14px;
  }
}
</style>
