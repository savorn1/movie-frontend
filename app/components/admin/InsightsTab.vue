<script setup lang="ts">
interface Row {
  ep: number
  starts: number
  completes: number
  completionRate: number | null
  continueRate: number | null
}

const { latest } = useCatalog()
const seriesId = ref(latest.value[0]?.id ?? 1)

const { data, status } = useFetch<{ title: string; episodes: Row[] }>(() => `/api/admin/insights/${seriesId.value}`, {
  server: false
})

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const maxStarts = computed(() => Math.max(1, ...(data.value?.episodes.map(e => e.starts) ?? [1])))

// The episode after which the largest share of finishers did not continue
const biggestDrop = computed(() => {
  const rows = (data.value?.episodes ?? []).filter(r => r.continueRate !== null && r.completes >= 1)
  return rows.length ? rows.reduce((a, b) => (b.continueRate! < a.continueRate! ? b : a)) : null
})
const totals = computed(() => {
  const rows = data.value?.episodes ?? []
  const starts = rows.reduce((n, r) => n + r.starts, 0)
  const completes = rows.reduce((n, r) => n + r.completes, 0)
  return { viewers: rows[0]?.starts ?? 0, starts, completion: starts ? completes / starts : null }
})
</script>

<template>
  <section>
    <label class="picker">
      <span>រឿង</span>
      <select v-model.number="seriesId">
        <option v-for="m in latest" :key="m.id" :value="m.id">{{ m.title }} (#{{ m.id }})</option>
      </select>
    </label>

    <p v-if="status === 'pending'" class="muted">កំពុងផ្ទុក…</p>
    <template v-else-if="data">
      <div class="cards">
        <div class="card"><small>ចាប់ផ្តើមវគ្គ ១</small><strong>{{ totals.viewers }}</strong></div>
        <div class="card"><small>ការចាក់សរុប</small><strong>{{ totals.starts }}</strong></div>
        <div class="card"><small>មើលចប់ (មធ្យម)</small><strong>{{ pct(totals.completion) }}</strong></div>
        <div class="card" :class="{ alert: biggestDrop }">
          <small>បោះបង់ច្រើនបំផុតក្រោយ</small>
          <strong>{{ biggestDrop ? `វគ្គ ${biggestDrop.ep} · ${pct(biggestDrop.continueRate)} continue` : '—' }}</strong>
        </div>
      </div>

      <p class="note">
        Counts are per device: each episode counts once when it first plays, and once when watched to 90%.
        “Continue” is the share of people who finished an episode and then started the next one.
      </p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">វគ្គ</th>
              <th scope="col" class="num">ចាប់ផ្តើម</th>
              <th scope="col" class="bar-col"><span class="sr-only">Starts bar</span></th>
              <th scope="col" class="num">មើលចប់</th>
              <th scope="col" class="num">% ចប់</th>
              <th scope="col" class="num">% បន្ត</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.episodes" :key="r.ep" :class="{ drop: biggestDrop?.ep === r.ep }">
              <td>{{ r.ep }}</td>
              <td class="num">{{ r.starts }}</td>
              <td class="bar-col"><span class="bar" :style="{ width: `${(r.starts / maxStarts) * 100}%` }" /></td>
              <td class="num">{{ r.completes }}</td>
              <td class="num">{{ pct(r.completionRate) }}</td>
              <td class="num">{{ pct(r.continueRate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.picker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.picker select {
  min-height: 40px;
  max-width: 100%;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
}

.muted,
.note {
  color: var(--text-muted);
  font-size: 14px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.card {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.card small {
  color: var(--text-muted);
}

.card strong {
  color: var(--text-strong);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.card.alert {
  border-color: #d70015;
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

th {
  background: var(--bg-elev);
  color: var(--text-muted);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.bar-col {
  width: 40%;
  min-width: 120px;
}

.bar {
  display: block;
  height: 10px;
  border-radius: 5px;
  background: var(--accent);
}

tr.drop td {
  background: rgba(215, 0, 21, 0.1);
}
</style>
