<script setup lang="ts">
// Release schedule: episodes scheduled in videolingo-web for the next 7 days, by day. Days and times
// are the viewer's own (their time zone), so the list renders in the browser only.
interface Slot {
  seriesId: number
  title: string
  posterUrl: string | null
  verticalUrl: string | null
  episode: number
  publishAt: string
}

usePageMeta({ title: 'កាលវិភាគវគ្គថ្មី', description: 'វគ្គថ្មីដែលនឹងចេញក្នុង ៧ ថ្ងៃខាងមុខ' })

const { data, status } = useFetch<Slot[]>('/api/schedule', { default: () => [], server: false })
const { find } = useCatalog()
const hydrated = useHydrated()

// Grouped by the viewer's own calendar day
const days = computed(() => {
  const groups = new Map<string, { label: string; today: boolean; slots: Slot[] }>()
  const today = new Date().toDateString()
  const tomorrow = new Date(Date.now() + 86_400_000).toDateString()
  for (const s of data.value) {
    const d = new Date(s.publishAt)
    const key = d.toDateString()
    const label = key === today ? 'ថ្ងៃនេះ' : key === tomorrow ? 'ថ្ងៃស្អែក' : khDay(d)
    if (!groups.has(key)) groups.set(key, { label, today: key === today, slots: [] })
    groups.get(key)!.slots.push(s)
  }
  return [...groups.values()]
})

const poster = (s: Slot) => s.verticalUrl ?? s.posterUrl ?? find(s.seriesId)?.vertical ?? ''
</script>

<template>
  <div class="page">
    <h1><AppIcon name="calendar" :size="26" /> កាលវិភាគវគ្គថ្មី</h1>
    <p class="lead">វគ្គដែលនឹងចេញក្នុង ៧ ថ្ងៃខាងមុខ · តាមដានរឿង ដើម្បីទទួលដំណឹងពេលចេញ</p>

    <ClientOnly>
    <div v-if="status === 'pending' || status === 'idle'" class="skeleton-list" aria-busy="true" aria-label="កំពុងផ្ទុក">
      <span v-for="i in 4" :key="i" class="sk shimmer" />
    </div>
    <EmptyState v-else-if="!days.length" icon="calendar" message="មិនទាន់មានវគ្គថ្មីកំណត់ពេលនៅឡើយ">
      <NuxtLink to="/browse" class="btn btn-outline">មើលអាប់ដេតថ្មី</NuxtLink>
    </EmptyState>

    <section v-for="d in days" :key="d.label" class="day" :class="{ today: d.today }">
      <h2>{{ d.label }}<span v-if="d.today" class="live">ចេញថ្ងៃនេះ</span></h2>
      <ul class="cascade">
        <li v-for="s in d.slots" :key="`${s.seriesId}-${s.episode}`" class="slot">
          <NuxtLink :to="`/detail/${s.seriesId}`" class="slot-link">
            <img :src="poster(s)" alt="" width="54" height="72" loading="lazy">
            <span class="info">
              <strong>{{ s.title }}</strong>
              <span>វគ្គ {{ kh(s.episode) }} · <time :datetime="s.publishAt">{{ khTime(new Date(s.publishAt)) }}</time></span>
            </span>
          </NuxtLink>
          <!-- "Notify me": follows the series (Telegram, this browser's notifications, or the bot) -->
          <FollowButton v-if="hydrated && find(s.seriesId)" :movie="find(s.seriesId)!" compact class="notify" />
        </li>
      </ul>
    </section>
      <template #fallback>
        <p class="muted">កំពុងផ្ទុក…</p>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 88px 16px 48px;
}

h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.lead,
.muted {
  color: var(--text-muted);
}

.day h2 {
  margin: 24px 0 8px;
  font-size: 18px;
}

ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elev);
  color: var(--text);
}

.slot:hover {
  border-color: var(--accent);
}

.slot-link {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.notify {
  flex: none;
}

.day.today .slot {
  border-color: var(--accent);
}

.day h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 700;
}

.skeleton-list {
  display: grid;
  gap: 8px;
  margin-top: 24px;
}

.sk {
  height: 90px;
  border-radius: 12px;
}

.slot img {
  flex: none;
  width: 54px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--bg);
}

.info {
  display: grid;
  flex: 1;
  min-width: 0;
}

.info strong {
  overflow: hidden;
  color: var(--text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info span {
  color: var(--text-muted);
  font-size: 14px;
}

time {
  color: var(--accent-text);
  font-weight: 700;
}
</style>
