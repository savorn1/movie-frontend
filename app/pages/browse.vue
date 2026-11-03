<script setup lang="ts">
import {
  categoryLabels, SHORT_SERIES,
  type AccessKey, type Category, type LengthKey, type LikeTotals, type SortKey, type StatusKey
} from '#shared/data/movies'

usePageMeta({ title: 'រុករករឿង', description: 'រុករករឿងភាគខ្មែរតាមប្រភេទ៖ ក្បាច់គុន ស្នេហា និងពិភពស្រមើស្រមៃ។ តម្រៀបតាមថ្មីបំផុត ពេញនិយម ឬអ្នកទស្សនាចូលចិត្តបំផុត។' })

interface Option<K> { key: K; label: string }

const categories: Option<Category | 'all'>[] = [
  { key: 'all', label: 'ទាំងអស់' },
  ...(Object.entries(categoryLabels) as [Category, string][]).map(([key, label]) => ({ key, label }))
]
// Secondary filters share one row of small chip groups
const accessOptions: Option<AccessKey>[] = [
  { key: 'all', label: 'ទាំងអស់' },
  { key: 'free', label: 'ឥតគិតថ្លៃ' },
  { key: 'vip', label: 'VIP' }
]
const statusOptions: Option<StatusKey>[] = [
  { key: 'all', label: 'ទាំងអស់' },
  { key: 'ongoing', label: 'កំពុងចាក់' },
  { key: 'completed', label: 'ចប់ហើយ' }
]
const lengthOptions: Option<LengthKey>[] = [
  { key: 'all', label: 'គ្រប់ប្រវែង' },
  { key: 'short', label: `ខ្លី (< ${kh(SHORT_SERIES)} វគ្គ)` },
  { key: 'long', label: 'វែង' }
]
const groups = [
  { name: 'access' as const, label: 'សិទ្ធិមើល', options: accessOptions },
  { name: 'status' as const, label: 'ស្ថានភាព', options: statusOptions },
  { name: 'length' as const, label: 'ប្រវែង', options: lengthOptions }
]
const sortOptions: Option<SortKey>[] = [
  { key: 'latest', label: 'ថ្មីបំផុត' },
  { key: 'popular', label: 'ពេញនិយម' },
  { key: 'liked', label: 'ចូលចិត្តបំផុត 👍' },
  { key: 'episodes', label: 'វគ្គច្រើន' }
]

// Filters live in the URL so a filtered view can be shared or reloaded
const route = useRoute()
const router = useRouter()
const pick = <T extends string>(v: unknown, allowed: Option<T>[], fallback: T) =>
  allowed.some(o => o.key === v) ? (v as T) : fallback

const category = computed(() => pick(route.query.category, categories, 'all'))
const selected = computed(() => ({
  access: pick(route.query.access, accessOptions, 'all'),
  status: pick(route.query.status, statusOptions, 'all'),
  length: pick(route.query.length, lengthOptions, 'all')
}))
const sort = computed(() => pick(route.query.sort, sortOptions, 'latest'))

type FilterKey = 'category' | 'access' | 'status' | 'length' | 'sort'
const defaults: Record<FilterKey, string> = { category: 'all', access: 'all', status: 'all', length: 'all', sort: 'latest' }

function set(key: FilterKey, value: string) {
  router.replace({ query: { ...route.query, [key]: value === defaults[key] ? undefined : value } })
}

// Like totals only matter for the "most liked" sort, so fetch them lazily
const { data: likes, status: likesStatus, execute: loadLikes } = useLazyFetch<Record<number, LikeTotals>>('/api/ratings/summary', {
  default: () => ({}),
  immediate: false,
  server: false
})
onMounted(() => {
  watch(sort, (s) => {
    if (s === 'liked' && likesStatus.value === 'idle') loadLikes()
  }, { immediate: true })
})
const { browse } = useCatalog()

const results = computed(() => browse({ category: category.value, ...selected.value, sort: sort.value }, likes.value))
const filtered = computed(() => category.value !== 'all' || Object.values(selected.value).some(v => v !== 'all'))
const reset = () => router.replace({ query: sort.value === 'latest' ? {} : { sort: sort.value } })
</script>

<template>
  <div class="page">
    <h1 class="page-title display">រុករករឿង</h1>

    <div class="filters">
      <div class="chips" role="group" aria-label="ប្រភេទ">
        <button
          v-for="c in categories"
          :key="c.key"
          type="button"
          :aria-pressed="category === c.key"
          @click="set('category', c.key)"
        >
          {{ c.label }}
        </button>
      </div>

      <div class="row">
        <div class="groups">
          <div v-for="g in groups" :key="g.name" class="chips small" role="group" :aria-label="g.label">
            <button
              v-for="o in g.options"
              :key="o.key"
              type="button"
              :aria-pressed="selected[g.name] === o.key"
              @click="set(g.name, o.key)"
            >
              {{ o.label }}
            </button>
          </div>
        </div>

        <label class="sort">
          <span>តម្រៀប</span>
          <select :value="sort" @change="set('sort', ($event.target as HTMLSelectElement).value)">
            <option v-for="o in sortOptions" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <p class="count" aria-live="polite">
      {{ kh(results.length) }} រឿង
      <button v-if="filtered" type="button" class="link" @click="reset">សម្អាតតម្រង</button>
    </p>

    <div v-if="results.length" class="grid">
      <PosterCard v-for="(m, i) in results" :key="m.id" :movie="m" :eager="i < 6" />
    </div>
    <EmptyState v-else icon="compass" message="មិនមានរឿងដែលត្រូវនឹងតម្រងទាំងនេះទេ។">
      <button type="button" class="btn btn-outline" @click="reset">សម្អាតតម្រង</button>
    </EmptyState>
  </div>
</template>

<style scoped>

.filters {
  position: sticky;
  top: 64px;
  z-index: 20;
  display: grid;
  gap: 10px;
  margin: 0 -32px 8px;
  padding: 10px 32px;
  background: var(--header-solid);
  backdrop-filter: blur(16px);
}

@media (prefers-reduced-transparency: reduce) {
  .filters {
    background: var(--bg);
    backdrop-filter: none;
  }
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chips button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  color: var(--text);
  font-weight: 500;
}

.chips button:hover {
  background: var(--bg-hover);
}

.chips button[aria-pressed='true'] {
  background: var(--text-strong);
  color: var(--bg);
  font-weight: 600;
}

.groups {
  display: flex;
  gap: 8px 16px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.groups::-webkit-scrollbar {
  display: none;
}

/* A thin divider between chip groups */
.groups .chips + .chips {
  padding-left: 16px;
  border-left: 1px solid var(--border);
}

.chips.small button {
  min-height: 34px;
  padding: 0 14px;
  font-size: 14px;
}

.sort {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 14px;
}

.sort select {
  min-height: 36px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
}

.count {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 16px;
  color: var(--text-muted);
  font-size: 14px;
}

.link {
  min-height: 36px;
  color: var(--text-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 24px 16px;
}

@media (max-width: 768px) {
  .filters {
    top: 56px;
    margin: 0 -16px 8px;
    padding: 10px 16px;
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px 10px;
  }
}
</style>
