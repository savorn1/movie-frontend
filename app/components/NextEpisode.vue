<script setup lang="ts">
// "Episode N comes out … in 2h 05m" for a series with a scheduled episode (set in VideoLingo)
const props = defineProps<{ at: number; episode: number }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 30_000)))
onBeforeUnmount(() => clearInterval(timer))

const left = computed(() => props.at - now.value)

const when = computed(() => {
  const d = new Date(props.at)
  return `${khDay(d)} ម៉ោង ${khTime(d)}`
})

const countdown = computed(() => {
  const mins = Math.max(0, Math.round(left.value / 60_000))
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (days) return kh(`${days} ថ្ងៃ ${hours} ម៉ោង`)
  if (hours) return kh(`${hours} ម៉ោង ${m} នាទី`)
  return kh(`${Math.max(1, m)} នាទី`)
})
</script>

<template>
  <div v-if="left > 0" class="next" role="status">
    <AppIcon name="bell" :size="18" />
    <span>
      <strong>វគ្គ {{ kh(episode) }}</strong> ចេញ {{ when }}
      <span class="in">· ក្នុង {{ countdown }}</span>
    </span>
  </div>
</template>

<style scoped>
.next {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 8px 14px;
  border-radius: 12px;
  background: var(--bg-elev-2);
  color: var(--text);
  font-size: 14px;
}

.next strong {
  color: var(--text-strong);
}

.in {
  color: var(--text-muted);
}
</style>
