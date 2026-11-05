<script setup lang="ts">
// Me page: fan level (from episodes finished), progress to the next one, and badges earned
interface Fan {
  level: number
  badges: string[]
  episodes: number
  likes: number
  bestStreak: number
}

const { viewer } = useViewer()
const fan = ref<Fan | null>(null)
async function load() {
  if (!viewer.value) return
  fan.value = await $fetch<Fan>('/api/fan').catch(() => null)
}
onMounted(load)
watch(() => viewer.value?.id, load)

const next = computed(() => (fan.value ? FAN_LEVELS[fan.value.level] ?? null : null))
const from = computed(() => (fan.value ? FAN_LEVELS[fan.value.level - 1] ?? 0 : 0))
const progress = computed(() =>
  fan.value && next.value ? Math.min(1, (fan.value.episodes - from.value) / (next.value - from.value)) : 1
)
</script>

<template>
  <section v-if="viewer && fan" class="fan" aria-labelledby="fan-title">
    <div class="head">
      <span class="lv" aria-hidden="true">Lv.{{ fan.level }}</span>
      <div>
        <h2 id="fan-title">កម្រិតអ្នកគាំទ្រ {{ kh(fan.level) }}</h2>
        <p class="sub">
          បានមើលចប់ {{ kh(fan.episodes) }} វគ្គ
          <template v-if="next"> · ត្រូវការ {{ kh(next - fan.episodes) }} វគ្គទៀតដល់កម្រិត {{ kh(fan.level + 1) }}</template>
        </p>
      </div>
    </div>
    <span v-if="next" class="bar" role="progressbar" :aria-valuenow="fan.episodes" :aria-valuemin="from" :aria-valuemax="next">
      <span :style="{ width: `${progress * 100}%` }" />
    </span>
    <ul v-if="fan.badges.length" class="badges">
      <li v-for="b in fan.badges" :key="b"><span aria-hidden="true">{{ FAN_BADGES[b]?.icon }}</span> {{ FAN_BADGES[b]?.label }}</li>
    </ul>
    <p v-else class="sub">ចុះឈ្មោះ ៧ ថ្ងៃជាប់ ឬបញ្ចេញមតិល្អៗ ដើម្បីទទួលបានផ្លាកសញ្ញា។ ផ្លាកសញ្ញាបង្ហាញក្បែរឈ្មោះអ្នកនៅក្នុងមតិ។</p>
  </section>
</template>

<style scoped>
.fan {
  display: grid;
  gap: 10px;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lv {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6, #e5484d);
  color: #fff;
  font-weight: 800;
}

h2 {
  margin: 0;
  font-size: 18px;
}

.sub {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.bar {
  display: block;
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--bg-elev-2);
}

.bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #e5484d);
  transition: width var(--dur-slow) var(--ease-out);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.badges li {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  font-size: 14px;
}
</style>
