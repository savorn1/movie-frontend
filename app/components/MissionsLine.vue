<script setup lang="ts">
/*
 * Home page: today's missions as one slim line (the full card with Collect buttons is on the Me page),
 * so a viewer sees series before chores. Highlighted when coins are waiting to be collected.
 */
interface Mission {
  key: string
  goal: number
  progress: number
  coins: number
  claimed: boolean
}

const { viewer } = useViewer()
const missions = useState<Mission[] | null>('missions', () => null)

async function load() {
  if (!viewer.value) return
  try {
    missions.value = await $fetch<Mission[]>('/api/missions')
  } catch {
    // Missions are extra
  }
}
onMounted(() => missions.value ?? load())
watch(() => viewer.value?.id, load)

const done = computed(() => missions.value?.filter(m => m.claimed || m.progress >= m.goal).length ?? 0)
const ready = computed(() => missions.value?.filter(m => !m.claimed && m.progress >= m.goal).reduce((a, m) => a + m.coins, 0) ?? 0)
const left = computed(() => missions.value?.filter(m => !m.claimed).reduce((a, m) => a + m.coins, 0) ?? 0)
</script>

<template>
  <NuxtLink v-if="viewer && missions?.length && left" to="/library#missions" class="line" :class="{ ready }">
    <AppIcon name="sparkle" :size="16" class="ic" />
    <span class="text">
      <template v-if="ready">មានកាក់ <strong>+{{ kh(ready) }}</strong> រង់ចាំអ្នកទទួល</template>
      <template v-else>បេសកកម្មថ្ងៃនេះ {{ kh(done) }}/{{ kh(missions.length) }} · រកបាន <strong>+{{ kh(left) }}</strong> កាក់</template>
    </span>
    <AppIcon name="chevron-right" :size="16" class="chev" />
  </NuxtLink>
</template>

<style scoped>
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin-bottom: 20px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elev);
  color: var(--text);
  font-size: 14px;
}

.line:hover {
  background: var(--bg-hover);
}

.ic {
  flex: none;
  color: var(--accent-text);
}

.text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text strong {
  color: var(--text-strong);
}

.chev {
  flex: none;
  color: var(--text-muted);
}

/* Coins waiting: yellow edge and a nudge so it gets noticed */
.line.ready {
  border-color: var(--accent);
}

.line.ready .ic {
  animation: nudge 1.2s var(--ease-out) 2;
}
</style>
