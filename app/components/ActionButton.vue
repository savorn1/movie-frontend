<script setup lang="ts">
// Icon above a short label (Follow / Save / Share). `pressed` makes it a toggle button;
// tone "love" turns the icon red while pressed (Save).
defineProps<{ icon: string; label: string; pressed?: boolean; tone?: 'love' }>()
</script>

<template>
  <button type="button" class="action" :aria-pressed="pressed" :data-tone="tone">
    <AppIcon :name="icon" :size="20" :solid="pressed" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 68px;
  min-height: 48px;
  padding: 4px 8px;
  border-radius: 12px;
  color: var(--text);
  font-size: 13px;
}

.action:hover {
  background: var(--bg-hover);
}

.action[aria-pressed='true'] {
  color: var(--text-strong);
  font-weight: 600;
}

.action[data-tone='love'][aria-pressed='true'] svg {
  color: #ff4d6d;
}
</style>
