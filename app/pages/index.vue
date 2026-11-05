<script setup lang="ts">
import { homeSections } from '#shared/data/movies'

const { featured, hotNow, movies } = useCatalog()
const { homeRows } = useSite()

usePageMeta({})

const { continueWatching, newForYou } = useLibrary()
const top10 = computed(() => hotNow.value.slice(0, 10))
const forYou = useForYou()
const becauseYouWatched = useBecauseYouWatched()

// Watch history lives in the browser, so these rows appear after the page loads. Remember how many
// there were last time and hold that space on the server-rendered page, so nothing below jumps.
const personalRows = useCookie<number>('rf-rows', { default: () => 0, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
const personalNow = computed(() => (newForYou.value.length ? 1 : 0) + (continueWatching.value.length ? 1 : 0))
onMounted(() => watch(personalNow, (n) => (personalRows.value = n), { immediate: true }))

// Swipeable rows keep Home short; the full grids live on Browse, pre-filtered by "See all". Which rows, in
// what order, is set in the admin portal (RuengFlix › Home rows)
const sections = computed(() => homeSections(movies.value, homeRows.value))
</script>

<template>
  <div>
    <h1 class="sr-only">RuengFlix - រឿងភាគខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗ</h1>
    <HeroSlider v-if="featured.length" :items="featured" />

    <div class="content">
      <ClientOnly>
        <PromoBanner />
      </ClientOnly>
      <!-- Posters first: the viewer's own rows, then today's top 10, then everything else -->
      <ClientOnly>
        <MovieRow
          v-if="newForYou.length"
          title="វគ្គថ្មីសម្រាប់អ្នក"
          more="/library"
          :items="newForYou"
          small
          :col="[168, 124]"
        />
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
        <template #fallback>
          <RowSkeleton v-for="i in Math.min(2, Number(personalRows) || 0)" :key="i" />
        </template>
      </ClientOnly>

      <MovieRow title="កំពុងពេញនិយមថ្ងៃនេះ" more="/hot" :items="[]" small hot :col="[176, 150]">
        <RankPoster v-for="(m, i) in top10" :key="m.id" :movie="m" :rank="i + 1" :width="120" class="top10" />
      </MovieRow>

      <ClientOnly>
        <GenrePicker />
        <MissionsLine />
        <MovieRow
          v-if="becauseYouWatched"
          :title="`ព្រោះអ្នកបានមើល “${becauseYouWatched.source.title}”`"
          :items="becauseYouWatched.items"
          small
          :col="[168, 124]"
        />
        <MovieRow
          v-if="forYou"
          :title="`ព្រោះអ្នកចូលចិត្តរឿង${forYou.label}`"
          :more="`/browse?category=${forYou.category}`"
          :items="forYou.items"
          small
          :col="[168, 124]"
        />
      </ClientOnly>

      <MovieRow v-for="(s, i) in sections" :key="`${i}-${s.title}`" :title="s.title" :more="s.more" :items="s.items" small :col="[168, 124]" />
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
