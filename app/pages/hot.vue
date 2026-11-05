<script setup lang="ts">
import { shareImage } from '#shared/data/movies'

const { hotNow, hotWeek } = useCatalog()

usePageMeta(() => ({
  title: 'ចំណាត់ថ្នាក់',
  description: `រឿងពេញនិយមបំផុតថ្ងៃនេះ និងសប្ដាហ៍នេះ។ លេខ ១៖ ${hotNow.value[0]?.title ?? ''}`,
  image: hotNow.value[0] ? shareImage(hotNow.value[0]) : undefined
}))

const tabs = [
  { key: 'now', label: 'ពេញនិយមឥឡូវនេះ', items: hotNow },
  { key: 'week', label: 'ពេញនិយមសប្ដាហ៍នេះ', items: hotWeek }
] as const

type TabKey = (typeof tabs)[number]['key']
const active = ref<TabKey>('now')
const list = computed(() => tabs.find(t => t.key === active.value)!.items.value)

// Arrow keys move between tabs, as with a native segmented control
function onKey(e: KeyboardEvent) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  const i = tabs.findIndex(t => t.key === active.value)
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]!
  active.value = next.key
  ;(document.getElementById(`tab-${next.key}`) as HTMLElement | null)?.focus()
}
</script>

<template>
  <div class="page">
    <h1 class="page-title display">ចំណាត់ថ្នាក់</h1>
    <div class="segmented" role="tablist" aria-label="រយៈពេល" @keydown="onKey">
      <button
        v-for="t in tabs"
        :id="`tab-${t.key}`"
        :key="t.key"
        type="button"
        role="tab"
        aria-controls="rank-panel"
        :aria-selected="active === t.key"
        :tabindex="active === t.key ? 0 : -1"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </div>

    <div id="rank-panel" class="grid cascade" role="tabpanel" :aria-labelledby="`tab-${active}`">
      <RankCard v-for="(m, i) in list" :key="`${active}-${m.id}`" :movie="m" :rank="i + 1" />
    </div>
  </div>
</template>

<style scoped>

.segmented {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 28px;
  padding: 4px;
  border-radius: 999px;
  background: var(--bg-elev-2);
}

.segmented button {
  min-height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  color: var(--text-muted);
  font-weight: 600;
}

.segmented button[aria-selected='true'] {
  background: var(--bg-elev);
  color: var(--text-strong);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px 16px;
}

@media (max-width: 768px) {
  .segmented {
    display: flex;
  }

  .segmented button {
    flex: 1;
    padding: 0 8px;
    font-size: 14px;
  }

  .grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
