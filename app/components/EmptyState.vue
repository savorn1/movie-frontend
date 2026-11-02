<script setup lang="ts">
// Empty screens say what will appear and offer the next step (slot: actions).
defineProps<{ icon?: string; message: string }>()
</script>

<template>
  <div class="empty">
    <AppIcon v-if="icon" :name="icon" :size="32" />
    <p>{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 48px 16px;
  border-radius: 16px;
  background: var(--bg-elev);
  color: var(--text-muted);
  text-align: center;
}

p {
  max-width: 400px;
  margin: 0;
}
</style>
