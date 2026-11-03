<script setup lang="ts">
interface Report {
  id: string
  seriesId: number
  ep: number
  reason: 'video' | 'subtitles' | 'audio' | 'other'
  note: string
  time: number
  at: number
  resolved: boolean
}

const REASONS: Record<Report['reason'], string> = {
  video: 'វីដេអូមិនដើរ',
  subtitles: 'អក្សររត់ខុស',
  audio: 'សំឡេងមានបញ្ហា',
  other: 'ផ្សេងៗ'
}

const { find } = useCatalog()
const { show } = useToast()
const { data, status, refresh } = useFetch<Report[]>('/api/admin/reports', { server: false, default: () => [] })

const showResolved = ref(false)
const list = computed(() => data.value.filter(r => showResolved.value || !r.resolved))
const open = computed(() => data.value.filter(r => !r.resolved).length)

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const when = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

async function setResolved(r: Report, resolved: boolean) {
  await $fetch(`/api/admin/reports/${r.id}`, { method: 'PATCH', body: { resolved } })
  await refresh()
  show(resolved ? 'បានដោះស្រាយ' : 'បានបើកវិញ', { label: 'មិនធ្វើវិញ', run: () => setResolved(r, !resolved) })
}
</script>

<template>
  <section>
    <div class="toolbar">
      <strong>{{ open }} open</strong>
      <label class="check">
        <input v-model="showResolved" type="checkbox">
        <span>បង្ហាញដែលបានដោះស្រាយ</span>
      </label>
    </div>

    <p v-if="status === 'pending'" class="muted">កំពុងផ្ទុក…</p>
    <EmptyState v-else-if="!list.length" icon="check" message="គ្មានរបាយការណ៍បញ្ហាទេ។" />
    <ul v-else class="list">
      <li v-for="r in list" :key="r.id" class="item" :class="{ resolved: r.resolved }">
        <div class="head">
          <span class="reason">{{ REASONS[r.reason] }}</span>
          <span class="muted">{{ when(r.at) }}</span>
        </div>
        <div>
          <strong>{{ find(r.seriesId)?.title ?? `#${r.seriesId}` }}</strong>
          · វគ្គ {{ r.ep }} · {{ clock(r.time) }}
        </div>
        <p v-if="r.note" class="note">“{{ r.note }}”</p>
        <div class="actions">
          <NuxtLink :to="`/watch/${r.seriesId}/${r.ep}?t=${r.time}`" target="_blank" class="btn btn-outline small">មើលចំណុចនេះ</NuxtLink>
          <button type="button" class="btn small" :class="r.resolved ? 'btn-outline' : 'btn-primary'" @click="setResolved(r, !r.resolved)">
            {{ r.resolved ? 'បើកវិញ' : 'បានដោះស្រាយ' }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}

.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.item.resolved {
  opacity: 0.6;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.reason {
  color: var(--text-strong);
  font-weight: 600;
}

.note {
  margin: 0;
  color: var(--text);
}

.actions {
  display: flex;
  gap: 8px;
}

.btn.small {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}
</style>
