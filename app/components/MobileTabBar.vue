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
</script>

<template>
  <nav class="tabbar" aria-label="ម៉ឺនុយមេ">
    <NuxtLink v-for="t in tabs" :key="t.to" v-slot="{ isActive, href, navigate }" :to="t.to" custom>
      <a :href="href ?? undefined" :class="{ active: isActive }" :aria-current="isActive ? 'page' : undefined" @click="navigate">
        <span class="icon-wrap">
          <AppIcon :name="t.icon" :size="24" :solid="isActive" />
          <small v-if="t.to === '/library' && hydrated && totalNew" class="badge" :aria-label="`វគ្គថ្មី ${kh(totalNew)}`">{{ kh(totalNew) }}</small>
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
    font-size: 12.5px;
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
</style>
