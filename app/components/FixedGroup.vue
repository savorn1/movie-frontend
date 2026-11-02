<script setup lang="ts">
const showTop = ref(false)
const onScroll = () => (showTop.value = window.scrollY > 600)

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

function toTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<template>
  <Transition name="pop">
    <button v-show="showTop" type="button" class="to-top" aria-label="ត្រឡប់ទៅខាងលើ" @click="toTop">
      <AppIcon name="arrow-up" />
    </button>
  </Transition>
</template>

<style scoped>
.to-top {
  position: fixed;
  right: 24px;
  bottom: 40px;
  z-index: 55;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  color: var(--text-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.to-top:hover {
  background: var(--bg-hover);
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1024px) {
  .to-top {
    right: 16px;
    bottom: calc(76px + env(safe-area-inset-bottom));
  }
}
</style>
