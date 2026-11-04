<script setup lang="ts">
const { byCategory, featured, hotNow, latest } = useCatalog()

usePageMeta({})

const { continueWatching } = useLibrary()
const top10 = computed(() => hotNow.value.slice(0, 10))
const forYou = useForYou()

// Swipeable rows keep Home short; the full grids live on Browse, pre-filtered by "See all"
const sections = computed(() => [
  { title: 'អាប់ដេតថ្មី', more: '/browse', items: latest.value.slice(0, 12) },
  { title: 'ក្បាច់គុន និងពិភពអមតៈ', more: '/browse?category=cultivation', items: byCategory('cultivation') },
  { title: 'ស្នេហា និងមនោសញ្ចេតនា', more: '/browse?category=romance', items: byCategory('romance') },
  { title: 'ពិភពស្រមើស្រមៃ និងអព្ភូតហេតុ', more: '/browse?category=fantasy', items: byCategory('fantasy') }
])
</script>

<template>
  <div>
    <h1 class="sr-only">RuengFlix - រឿងភាគខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗ</h1>
    <HeroSlider v-if="featured.length" :items="featured" />

    <div class="content">
      <ClientOnly>
        <MovieRow
          v-if="continueWatching.length"
          title="បន្តមើល"
          more="/library"
          :items="[]"
          small
        >
          <ContinueCard
            v-for="{ entry, movie } in continueWatching"
            :key="movie.id"
            :movie="movie"
            :entry="entry"
          />
        </MovieRow>
        <MovieRow
          v-if="forYou"
          :title="`ព្រោះអ្នកចូលចិត្តរឿង${forYou.label}`"
          :more="`/browse?category=${forYou.category}`"
          :items="forYou.items"
          small
          :col="[168, 124]"
        />
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
