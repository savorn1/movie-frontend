<script setup lang="ts">
// Placeholder for a poster row that only the browser can fill (watch history lives on the device);
// same size as MovieRow small, so nothing below it jumps when the real row arrives
defineProps<{ count?: number }>()
</script>

<template>
  <section class="module skeleton" aria-hidden="true">
    <span class="head shimmer" />
    <div class="items">
      <span v-for="i in count ?? 6" :key="i" class="card">
        <span class="cover shimmer" />
        <span class="line shimmer" />
      </span>
    </div>
  </section>
</template>

<style scoped>
.skeleton {
  margin-bottom: 32px;
  overflow: hidden;
}

.head {
  display: block;
  width: 140px;
  height: 22px;
  margin: 4px 0 14px;
  border-radius: 6px;
}

.items {
  display: flex;
  gap: 12px;
}

.card {
  display: grid;
  flex: none;
  gap: 8px;
  width: 168px;
}

.cover {
  aspect-ratio: 5 / 7;
  border-radius: 10px;
}

.line {
  width: 70%;
  height: 14px;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .card {
    width: 124px;
  }
}
</style>
