<script setup lang="ts">
// Tabs navigate only; search gets its own tab because the phone header has no room for it.
// VIP lives in the header pill and on the Me page, keeping the bar to five sections.
const tabs = [
  { to: '/', label: 'ទំព័រដើម', icon: 'home' },
  { to: '/shorts', label: 'ខ្លីៗ', icon: 'shorts' },
  { to: '/search', label: 'ស្វែងរក', icon: 'search' },
  { to: '/hot', label: 'ចំណាត់ថ្នាក់', icon: 'ranking' },
  { to: '/library', label: 'ខ្ញុំ', icon: 'user' }
]

const { totalNew } = useLibrary()
const hydrated = useHydrated()

/*
 * Out of the way while reading down a page (60 px is a lot on a phone, most of all held sideways),
 * back on the first scroll up, near the top, and on every new page. <html class="tabbar-hidden"> lets
 * toasts and the corner player drop into the space it leaves.
 */
const hidden = ref(false)
let lastY = 0
function onScroll() {
  const y = window.scrollY
  const dy = y - lastY
  if (Math.abs(dy) < 8) return
  hidden.value = dy > 0 && y > 120
  lastY = y
}
watch(hidden, h => document.documentElement.classList.toggle('tabbar-hidden', h))
const route = useRoute()
watch(() => route.path, () => {
  hidden.value = false
  lastY = 0
})
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.documentElement.classList.remove('tabbar-hidden')
})
</script>

<template>
  <nav class="tabbar" :class="{ hidden }" aria-label="ម៉ឺនុយមេ">
    <NuxtLink v-for="t in tabs" :key="t.to" v-slot="{ isActive, href, navigate }" :to="t.to" custom>
      <a :href="href ?? undefined" :class="{ active: isActive }" :aria-current="isActive ? 'page' : undefined" @click="navigate">
        <span class="icon-wrap">
          <AppIcon :name="t.icon" :size="24" :solid="isActive" />
          <small v-if="t.to === '/library' && hydrated && totalNew" :key="totalNew" class="badge" :aria-label="`វគ្គថ្មី ${kh(totalNew)}`">{{ kh(totalNew) }}</small>
        </span>
        <span>{{ t.label }}</span>
      </a>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.tabbar {
  display: none;
}

@media (max-width: 1024px) {
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 60;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    height: calc(60px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--header-solid);
    backdrop-filter: saturate(1.4) blur(16px);
    border-top: 1px solid var(--border);
    view-transition-name: tabbar;
    transition: transform var(--dur) var(--ease-out);
  }

  .tabbar.hidden {
    transform: translateY(100%);
    transition-timing-function: var(--ease-in);
  }

  @media (prefers-reduced-transparency: reduce) {
    .tabbar {
      background: var(--bg);
      backdrop-filter: none;
    }
  }

  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.4;
  }

  .icon-wrap {
    position: relative;
    display: grid;
  }

  .badge {
    position: absolute;
    top: -4px;
    right: -10px;
    min-width: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--signal);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
  }

  a.active {
    color: var(--text-strong);
    font-weight: 600;
  }
}

/* The tab you land on bounces its icon once; a new-episodes badge pops in (and again when it changes) */
.active .icon-wrap :deep(svg) {
  animation: tab-bounce 420ms var(--ease-spring);
}

.badge {
  animation: pop-in var(--dur-slow) var(--ease-spring);
}

@keyframes tab-bounce {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(0.82) translateY(1px);
  }
  70% {
    transform: scale(1.12) translateY(-2px);
  }
  100% {
    transform: scale(1);
  }
}
</style>
