<script setup lang="ts">
// How long until a promotion ends, ticking: "២ ថ្ងៃ ៥ ម៉ោង", then "៥:០៧:៣២" on the last day
const props = defineProps<{ until: string | number }>()

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)))
onBeforeUnmount(() => clearInterval(timer))

const text = computed(() => {
  const end = typeof props.until === 'number' ? props.until : Date.parse(props.until)
  const s = Math.max(0, Math.floor((end - now.value) / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  if (d >= 1) return `${kh(d)} ថ្ងៃ ${kh(h)} ម៉ោង`
  const m = Math.floor((s % 3600) / 60)
  return kh(`${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`)
})
</script>

<template>
  <ClientOnly>
    <time class="promo-countdown" :datetime="new Date(typeof until === 'number' ? until : Date.parse(until)).toISOString()">{{ text }}</time>
  </ClientOnly>
</template>

<style scoped>
.promo-countdown {
  font-variant-numeric: tabular-nums;
}
</style>
