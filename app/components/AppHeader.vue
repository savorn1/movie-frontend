<script setup lang="ts">
// Transparent over the home hero, solid everywhere else or once scrolled.
const route = useRoute()
const scrolled = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 20)
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
const solid = computed(() => scrolled.value || route.path !== '/')
</script>

<template>
  <header class="header" :class="{ solid }">
    <NuxtLink to="/" class="logo" aria-label="RuengFlix ទំព័រដើម">
      <span class="logo-mark display">R</span>
      <span class="logo-text display">RuengFlix</span>
    </NuxtLink>

    <SearchBox class="header-search" />

    <div class="header-op">
      <NuxtLink to="/library" class="op-btn" aria-label="ប្រវត្តិមើល និងចំណូលចិត្ត">
        <AppIcon name="history" :size="20" /><span>ប្រវត្តិមើល</span>
      </NuxtLink>
      <ThemeSwitcher class="theme" />
      <NuxtLink to="/vip" class="vip-pill" aria-label="សមាជិក VIP">
        <AppIcon name="crown" :size="16" /><span>VIP</span>
      </NuxtLink>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 64px;
  padding: 0 24px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
  transition: background 0.2s;
  view-transition-name: header;
}

.header.solid {
  background: var(--header-solid);
  backdrop-filter: saturate(1.4) blur(16px);
}

@media (prefers-reduced-transparency: reduce) {
  .header.solid {
    background: var(--bg);
    backdrop-filter: none;
  }
}

/* Light appearance: dark text can't sit on the hero photo, so the header is always solid */
:root[data-theme='light'] .header {
  background: var(--header-solid);
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  width: 168px;
}

.logo-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 20px;
  line-height: 1;
}

.logo-text {
  font-size: 24px;
  line-height: 1;
  color: var(--text-strong);
}

/* Over the hero image the header text stays light */
:root:not([data-theme='light']) .header:not(.solid) .logo-text,
:root:not([data-theme='light']) .header:not(.solid) .op-btn {
  color: #fff;
}

.header-search {
  flex: 1;
  max-width: 480px;
}

.header-op {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.op-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 999px;
  color: var(--text);
}

.op-btn:hover {
  background: var(--bg-hover);
}

.login {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text-strong);
  font-weight: 600;
}

.login:hover {
  background: var(--bg-hover);
}

.vip-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
  font-size: 13px;
  font-weight: 700;
}

.vip-pill:hover {
  filter: brightness(1.05);
}

/* On phones search and history live in the tab bar, so the header keeps brand and VIP */
@media (max-width: 768px) {
  .header {
    height: 56px;
    padding: 0 8px 0 16px;
  }

  .logo {
    width: auto;
  }

  /* History is the "Me" tab on phones */
  .header-search,
  .op-btn,
  .login {
    display: none;
  }

  .op-btn {
    width: 44px;
    justify-content: center;
    padding: 0;
  }
}
</style>
