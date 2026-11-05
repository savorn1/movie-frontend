<script setup lang="ts">
interface NavItem {
  to: string
  label: string
  icon: string
  /** Show the count of new episodes in followed series */
  newBadge?: boolean
  vip?: boolean
  divider?: boolean
}

// One destination per label; the mobile tab bar mirrors the same sections.
const items: NavItem[] = [
  { to: '/', label: 'ទំព័រដើម', icon: 'home' },
  { to: '/shorts', label: 'ខ្លីៗ', icon: 'shorts' },
  { to: '/browse', label: 'រុករករឿង', icon: 'compass' },
  { to: '/hot', label: 'ចំណាត់ថ្នាក់', icon: 'ranking' },
  { to: '/schedule', label: 'កាលវិភាគ', icon: 'calendar', divider: true },
  { to: '/library', label: 'ប្រវត្តិ & ចំណូលចិត្ត', icon: 'heart', newBadge: true },
  { to: '/vip', label: 'VIP', icon: 'crown', vip: true }
]

const { totalNew } = useLibrary()
const hydrated = useHydrated()
</script>

<template>
  <aside class="sidebar">
    <nav aria-label="ម៉ឺនុយមេ">
      <template v-for="item in items" :key="item.to">
        <NuxtLink v-slot="{ isExactActive, href, navigate }" :to="item.to" custom>
          <a
            :href="href ?? undefined"
            class="nav-item"
            :class="{ vip: item.vip, active: isExactActive }"
            :aria-current="isExactActive ? 'page' : undefined"
            @click="navigate"
          >
            <AppIcon :name="item.icon" :size="20" :solid="isExactActive" />
            <span>{{ item.label }}</span>
            <small v-if="item.newBadge && hydrated && totalNew" :aria-label="`វគ្គថ្មី ${kh(totalNew)}`">{{ kh(totalNew) }}</small>
          </a>
        </NuxtLink>
        <hr v-if="item.divider">
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  z-index: 40;
  width: 216px;
  padding: 8px 12px;
  overflow-y: auto;
  view-transition-name: sidebar;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  color: var(--text-muted);
  font-size: 15px;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-strong);
}

.nav-item.active {
  background: var(--bg-elev);
  color: var(--text-strong);
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 3px;
  background: var(--text-strong);
}

.nav-item.vip svg {
  color: var(--accent-text);
}

.nav-item small {
  margin-left: auto;
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--signal);
  color: #fff;
  font-size: 13px;
  text-align: center;
  line-height: 20px;
}

hr {
  width: 100%;
  margin: 8px 0;
  border: 0;
  border-top: 1px solid var(--border);
}

@media (max-width: 1024px) {
  .sidebar {
    display: none;
  }
}
</style>
