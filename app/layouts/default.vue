<script setup lang="ts">
// Full-height pages such as the Shorts feed opt out of the footer
const route = useRoute()
</script>

<template>
  <div class="app" :class="{ immersive: route.meta.immersive }">
    <AppHeader />
    <AppSidebar />
    <main class="main" :class="{ immersive: route.meta.hideFooter }">
      <InAppBanner />
      <ClientOnly><AccountNotices /></ClientOnly>
      <slot />
      <footer v-if="!route.meta.hideFooter" class="site-footer">
        <div class="foot-logo display">RuengFlix</div>
        <nav>
          <NuxtLink to="/browse">រុករករឿង</NuxtLink>
          <NuxtLink to="/shorts">ខ្លីៗ</NuxtLink>
          <NuxtLink to="/hot">ចំណាត់ថ្នាក់</NuxtLink>
          <NuxtLink to="/library">ប្រវត្តិ & ចំណូលចិត្ត</NuxtLink>
          <NuxtLink to="/vip">VIP</NuxtLink>
        </nav>
        <p>RuengFlix ជាគម្រោងសាកល្បងសម្រាប់ទស្សនារឿងភាគជាភាសាខ្មែរ។ រូបភាពទាំងអស់គឺជារូបគំរូ។</p>
      </footer>
    </main>
    <FixedGroup />
    <ToastHost />
    <ClientOnly><PushPrompt /></ClientOnly>
    <ClientOnly><MiniPlayer /></ClientOnly>
    <ClientOnly><PullToRefresh /></ClientOnly>
    <MobileTabBar />
  </div>
</template>

<style scoped>
.main {
  min-height: 100vh;
  margin-left: 216px;
  padding-top: 64px;
}

.site-footer {
  margin: 40px 32px 0;
  padding: 32px 0 40px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  text-align: center;
  font-size: 13px;
}

.foot-logo {
  margin-bottom: 12px;
  color: var(--text-strong);
  font-size: 26px;
}

.site-footer nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0 8px;
  margin-bottom: 10px;
}

/* Tall enough to hit with a thumb (≥ 36 px), spaced by their own padding */
.site-footer nav a {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 14px;
}

.site-footer a:hover {
  color: var(--text-strong);
}

@media (max-width: 1024px) {
  .main {
    margin-left: 0;
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .main.immersive {
    padding-bottom: 0;
  }
}

@media (max-width: 768px) {
  .main {
    padding-top: 56px;
  }

  /* Immersive pages (Shorts) take the whole phone screen: no header or tab bar */
  .immersive :deep(.header),
  .immersive :deep(.tabbar),
  .immersive :deep(.to-top) {
    display: none;
  }

  .immersive .main {
    padding-top: 0;
  }

  .site-footer {
    margin: 24px 16px 0;
  }
}
</style>
