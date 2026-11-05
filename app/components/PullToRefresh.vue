<script setup lang="ts">
/*
 * Pull down at the top of a page to refresh the catalog, wallet and account. Only in the installed app
 * (Home Screen / standalone): browsers already have their own pull-to-refresh, and two would fight.
 */
const { refresh: refreshCatalog } = useCatalog()
const { refresh: refreshWallet } = useWallet()
const { refreshViewer } = useViewer()
const { show } = useToast()
const route = useRoute()

const TRIGGER = 70
const pull = ref(0)
const refreshing = ref(false)
let startY: number | null = null
let enabled = false

function onStart(e: TouchEvent) {
  if (!enabled || refreshing.value || window.scrollY > 0 || route.meta.immersive || route.path.startsWith('/watch/')) return
  startY = e.touches[0]!.clientY
}
function onMove(e: TouchEvent) {
  if (startY === null) return
  const dy = e.touches[0]!.clientY - startY
  if (dy <= 0 || window.scrollY > 0) {
    pull.value = 0
    return
  }
  // Resistance: harder to pull the further it goes
  pull.value = Math.min(110, dy * 0.5)
}
async function onEnd() {
  if (startY === null) return
  startY = null
  if (pull.value < TRIGGER) {
    pull.value = 0
    return
  }
  refreshing.value = true
  pull.value = 56
  haptic('tap')
  try {
    await Promise.all([refreshCatalog(), refreshViewer(), refreshWallet(), refreshNuxtData()])
    show('បានធ្វើបច្ចុប្បន្នភាព')
  } catch {
    show('មិនអាចធ្វើបច្ចុប្បន្នភាពបានទេ')
  } finally {
    refreshing.value = false
    pull.value = 0
  }
}

onMounted(() => {
  enabled = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!enabled) return
  window.addEventListener('touchstart', onStart, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('touchend', onEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('touchstart', onStart)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('touchend', onEnd)
})
</script>

<template>
  <div v-if="pull > 0" class="ptr" :style="{ transform: `translate(-50%, ${pull}px)` }" role="status" :aria-label="refreshing ? 'កំពុងធ្វើបច្ចុប្បន្នភាព' : undefined">
    <AppIcon name="update" :size="20" :class="{ spin: refreshing }" :style="{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / 70) }" />
  </div>
</template>

<style scoped>
.ptr {
  position: fixed;
  top: 40px;
  left: 50%;
  z-index: 95;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-elev);
  color: var(--accent-text);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
