<script setup lang="ts">
import { categoryLabels, type Movie } from '#shared/data/movies'

const { movies, refresh } = useCatalog()
const { show } = useToast()

const query = ref('')
const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = [...movies.value].sort((a, b) => b.updatedAt - a.updatedAt)
  return q ? list.filter(m => m.title.includes(q) || m.latin.includes(q) || String(m.id) === q) : list
})

const editing = ref<Movie | null>(null)
const creating = ref(false)
const publishing = ref<Movie | null>(null)

const date = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

async function toggleVip(m: Movie) {
  try {
    await $fetch(`/api/admin/series/${m.id}`, { method: 'PUT', body: { vip: !m.vip } })
    await refresh()
    show(`${m.title}: ${!m.vip ? 'ជា VIP ហើយ' : 'ឥតគិតថ្លៃហើយ'}`)
  } catch {
    show('មិនអាចរក្សាទុកបានទេ')
  }
}

async function onSaved(message: string) {
  editing.value = null
  creating.value = false
  publishing.value = null
  await refresh()
  show(message)
}
</script>

<template>
  <section>
    <div class="toolbar">
      <input v-model="query" type="search" class="search" placeholder="ស្វែងរកតាមចំណងជើង ឬលេខ" aria-label="ស្វែងរករឿង">
      <span class="count">{{ rows.length }} series</span>
      <button type="button" class="btn btn-primary" @click="creating = true">+ បន្ថែមរឿង</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">រឿង</th>
            <th scope="col">ប្រភេទ</th>
            <th scope="col" class="num">វគ្គ</th>
            <th scope="col">ស្ថានភាព</th>
            <th scope="col">VIP</th>
            <th scope="col">អាប់ដេត</th>
            <th scope="col"><span class="sr-only">សកម្មភាព</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m.id">
            <td>
              <div class="title-cell">
                <img :src="m.poster" alt="" width="32" height="45">
                <span>
                  <NuxtLink :to="`/detail/${m.id}`" target="_blank">{{ m.title }}</NuxtLink>
                  <small>#{{ m.id }}</small>
                </span>
              </div>
            </td>
            <td>{{ categoryLabels[m.category] }}</td>
            <td class="num">{{ m.episodes }}</td>
            <td><span class="chip" :class="m.status">{{ m.status === 'ongoing' ? 'កំពុងចាក់' : 'ចប់ហើយ' }}</span></td>
            <td>
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="m.vip"
                :aria-label="`VIP: ${m.title}`"
                @click="toggleVip(m)"
              />
            </td>
            <td class="muted">{{ date(m.updatedAt) }}</td>
            <td>
              <div class="actions">
                <button type="button" class="btn btn-outline small" @click="editing = m">កែ</button>
                <button type="button" class="btn btn-primary small" @click="publishing = m">ចេញវគ្គ {{ m.episodes + 1 }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminSeriesForm v-if="creating || editing" :series="editing" @close="editing = null; creating = false" @saved="onSaved" />
    <AdminPublishDialog v-if="publishing" :series="publishing" @close="publishing = null" @published="onSaved" />
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
}

.count {
  margin-right: auto;
  color: var(--text-muted);
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid var(--border);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

th {
  background: var(--bg-elev);
  color: var(--text-muted);
  font-weight: 600;
}

tbody tr:hover {
  background: var(--bg-elev);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--text-muted);
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-cell img {
  border-radius: 4px;
  object-fit: cover;
}

.title-cell span {
  display: flex;
  flex-direction: column;
}

.title-cell a {
  color: var(--text-strong);
}

.title-cell a:hover {
  text-decoration: underline;
}

.title-cell small {
  color: var(--text-muted);
}

.chip {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  font-size: 13px;
}

.chip.ongoing {
  color: #33c46a;
}

:root[data-theme='light'] .chip.ongoing {
  color: #137a3a;
}

.switch {
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  transition: background 0.15s;
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: transform 0.15s, background 0.15s;
}

.switch[aria-checked='true'] {
  background: var(--accent);
}

.switch[aria-checked='true']::after {
  background: var(--accent-ink);
  transform: translateX(18px);
}

.actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.btn.small {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}
</style>
