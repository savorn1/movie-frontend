<script setup lang="ts">
import { byCategory, featured, hotNow, latest } from '#shared/data/movies'

useHead({ title: 'RuengFlix - រឿងភាគខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗ' })

const { continueWatching, seriesProgress } = useLibrary()
const top10 = hotNow.slice(0, 10)

// Swipeable rows keep Home short; the full grids live on Browse, pre-filtered by "See all"
const sections = [
  { title: 'អាប់ដេតថ្មី', more: '/browse', items: latest.slice(0, 12) },
  { title: 'ក្បាច់គុន និងពិភពអមតៈ', more: '/browse?category=cultivation', items: byCategory('cultivation') },
  { title: 'ស្នេហា និងមនោសញ្ចេតនា', more: '/browse?category=romance', items: byCategory('romance') },
  { title: 'ពិភពស្រមើស្រមៃ និងអព្ភូតហេតុ', more: '/browse?category=fantasy', items: byCategory('fantasy') }
]
</script>

<template>
  <div>
    <h1 class="sr-only">RuengFlix - រឿងភាគខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗ</h1>
    <HeroSlider :items="featured" />

    <div class="content">
      <ClientOnly>
        <MovieRow
          v-if="continueWatching.length"
          title="បន្តមើល"
          more="/library"
          :items="[]"
          small
        >
          <PosterCard
            v-for="{ entry, movie } in continueWatching"
            :key="movie.id"
            :movie="movie"
            :progress="{ ep: entry.ep, total: movie.episodes, value: seriesProgress(entry, movie.episodes) }"
          />
        </MovieRow>
      </ClientOnly>

      <MovieRow title="កំពុងពេញនិយមថ្ងៃនេះ" more="/hot" :items="[]" small hot :col="[176, 150]">
        <RankPoster v-for="(m, i) in top10" :key="m.id" :movie="m" :rank="i + 1" :width="120" class="top10" />
      </MovieRow>
      <MovieRow v-for="s in sections" :key="s.title" :title="s.title" :more="s.more" :items="s.items" small :col="[168, 124]" />
    </div>
  </div>
</template>

<style scoped>
.content {
  position: relative;
  z-index: 2;
  padding: 8px 32px 0;
}

.content {
  --surface: var(--bg);
}

@media (max-width: 768px) {
  .top10 {
    --w: 102px !important;
  }

  .content {
    padding: 16px 16px 0;
  }
}
</style>
