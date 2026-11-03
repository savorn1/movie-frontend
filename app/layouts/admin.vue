<script setup lang="ts">
const admin = useState('admin-logged-in', () => false)

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  admin.value = false
}
</script>

<template>
  <div class="admin-shell">
    <header class="bar">
      <NuxtLink to="/admin" class="brand">
        <span class="mark">R</span>
        <span>RuengFlix <b>Admin</b></span>
      </NuxtLink>
      <nav>
        <NuxtLink to="/" class="btn btn-outline">មើលគេហទំព័រ</NuxtLink>
        <button v-if="admin" type="button" class="btn btn-outline" @click="logout">ចាកចេញ</button>
      </nav>
    </header>
    <main class="body">
      <slot />
    </main>
    <ToastHost />
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 60px;
  padding: 0 24px;
  background: var(--header-solid);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-strong);
  font-weight: 600;
}

.brand b {
  color: var(--text-muted);
  font-weight: 500;
}

.mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 800;
}

nav {
  display: flex;
  gap: 8px;
}

.body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 640px) {
  .bar {
    padding: 0 12px;
  }

  .body {
    padding: 16px 12px;
  }
}
</style>
