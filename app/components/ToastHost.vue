<script setup lang="ts">
const { toasts, dismiss } = useToast()

function runAction(id: number, run: () => void) {
  run()
  dismiss(id)
}
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.tone">
        <AppIcon v-if="t.tone" :name="t.tone === 'success' ? 'check' : 'alert'" :size="18" class="tone" />
        <span>{{ t.message }}</span>
        <button v-if="t.action" type="button" class="action" @click="runAction(t.id, t.action.run)">
          {{ t.action.label }}
        </button>
        <button type="button" class="close" aria-label="បិទ" @click="dismiss(t.id)">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: calc(var(--float-base) + 8px + var(--float-lift));
  z-index: 90;
  transition: bottom var(--dur) var(--ease-out);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: min(440px, calc(100% - 32px));
  transform: translateX(-50%);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 48px;
  padding: 4px 4px 4px 16px;
  border-radius: 14px;
  background: var(--text-strong);
  color: var(--bg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}

.toast span {
  flex: 1;
}

.toast.success,
.toast.error {
  padding-left: 12px;
}

.tone {
  flex: none;
  margin-right: 4px;
}

.success .tone {
  color: #1f9d55;
}

.error .tone {
  color: #e5484d;
}

.action {
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.close {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: inherit;
  opacity: 0.7;
}

.action:hover,
.close:hover {
  background: rgba(127, 127, 127, 0.18);
  opacity: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

</style>
