<script setup lang="ts">
import { searchMovies } from '#shared/data/movies'

const props = defineProps<{ initial?: string; autofocus?: boolean }>()

const popular = ['រឿង AI', 'រឿងចិន', 'ស្នេហា', 'ក្បាច់គុន', 'សងសឹក', 'ផ្សងព្រេង']

const { recentSearches, addRecentSearch, clearRecentSearches } = useLibrary()

const id = useId()
const input = ref<HTMLInputElement>()
const query = ref(props.initial ?? '')
const debounced = ref(query.value)
const open = ref(false)
const activeIndex = ref(-1)

let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debounced.value = v), 100)
  activeIndex.value = -1
})

const results = computed(() => searchMovies(debounced.value).slice(0, 6))
const typing = computed(() => debounced.value.trim().length > 0)

function submit(term = query.value) {
  const t = term.trim()
  if (!t) return
  addRecentSearch(t)
  query.value = t
  open.value = false
  input.value?.blur()
  navigateTo({ path: '/search', query: { wd: t } })
}

function openResult(movieId: number) {
  addRecentSearch(query.value.trim())
  open.value = false
  navigateTo(`/detail/${movieId}`)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false
    return
  }
  if (!typing.value || !results.value.length) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const n = results.value.length
    activeIndex.value = (activeIndex.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
    open.value = true
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    openResult(results.value[activeIndex.value]!.id)
  }
}

onMounted(() => props.autofocus && input.value?.focus())
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <form class="search" role="search" @submit.prevent="submit()">
    <AppIcon name="search" :size="18" class="lead" />
    <input
      ref="input"
      v-model="query"
      type="search"
      class="search-input"
      placeholder="ស្វែងរកចំណងជើង ឬប្រភេទរឿង"
      aria-label="ស្វែងរករឿង"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined"
      enterkeyhint="search"
      autocomplete="off"
      @focus="open = true"
      @blur="open = false"
      @keydown="onKeydown"
    >
    <button v-if="query" type="button" class="clear" aria-label="សម្អាត" @mousedown.prevent @click="query = ''; input?.focus()">
      <AppIcon name="close" :size="16" />
    </button>

    <div v-show="open" class="pop" @mousedown.prevent>
      <template v-if="typing">
        <ul v-if="results.length" :id="`${id}-list`" role="listbox" class="results">
          <li
            v-for="(m, i) in results"
            :id="`${id}-opt-${i}`"
            :key="m.id"
            role="option"
            :aria-selected="i === activeIndex"
            :class="{ active: i === activeIndex }"
            @click="openResult(m.id)"
          >
            <img :src="m.poster" alt="" width="36" height="50">
            <span class="r-title">{{ m.title }}</span>
            <span class="r-meta">{{ m.episode }}</span>
          </li>
        </ul>
        <p v-else class="empty">រកមិនឃើញ “{{ debounced }}”។ សាកល្បងពាក្យខ្លីជាងនេះ។</p>
        <button type="button" class="all" @click="submit()">មើលលទ្ធផលទាំងអស់</button>
      </template>

      <template v-else>
        <div v-if="recentSearches.length" class="group">
          <div class="group-head">
            <strong>ការស្វែងរកថ្មីៗ</strong>
            <button type="button" class="link" @click="clearRecentSearches">សម្អាត</button>
          </div>
          <div class="tags">
            <button v-for="t in recentSearches" :key="t" type="button" @click="submit(t)">{{ t }}</button>
          </div>
        </div>
        <div class="group">
          <div class="group-head"><strong>ការស្វែងរកពេញនិយម</strong></div>
          <div class="tags">
            <button v-for="t in popular" :key="t" type="button" @click="submit(t)">{{ t }}</button>
          </div>
        </div>
      </template>
    </div>
  </form>
</template>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
  height: 42px;
  border-radius: 999px;
  background: var(--search-bg);
  backdrop-filter: blur(12px);
}

@media (prefers-reduced-transparency: reduce) {
  .search {
    background: var(--bg-elev-2);
    backdrop-filter: none;
  }
}

.search:focus-within {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}

.lead {
  flex-shrink: 0;
  margin-left: 14px;
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 10px;
  background: none;
  border: 0;
  outline: 0;
  color: var(--text);
  font: inherit;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.clear {
  display: grid;
  place-items: center;
  width: 40px;
  height: 100%;
  color: var(--text-muted);
}

.pop {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 70;
  padding: 8px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42);
}

.results {
  margin: 0;
  padding: 0;
  list-style: none;
}

.results li {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
}

.results li:hover,
.results li.active {
  background: var(--bg-hover);
}

.results img {
  width: 36px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--bg-elev-2);
}

.r-title {
  overflow: hidden;
  color: var(--text-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.r-meta {
  color: var(--text-muted);
  font-size: 13px;
}

.empty {
  margin: 8px;
  color: var(--text-muted);
}

.all {
  width: 100%;
  margin-top: 4px;
  padding: 10px;
  border-top: 1px solid var(--border);
  color: var(--text-strong);
  font-weight: 600;
}

.group {
  padding: 8px;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-strong);
}

.link {
  color: var(--text-muted);
  font-size: 13px;
}

.link:hover {
  color: var(--text-strong);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags button {
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  font-size: 14px;
}

.tags button:hover {
  background: var(--bg-hover);
}
</style>
