<script setup lang="ts">
// Our explanation before the browser's notification prompt (see usePush.explain)
const { softPrompt } = usePush()
const answer = (yes: boolean) => softPrompt.value?.resolve(yes)
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && softPrompt.value && answer(false)
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="rise">
    <div v-if="softPrompt" class="prompt" role="dialog" aria-modal="false" aria-labelledby="push-title">
      <span class="bell"><AppIcon name="bell" :size="22" /></span>
      <div class="text">
        <strong id="push-title">{{ softPrompt.title }}</strong>
        <p>មួយសារក្នុងមួយវគ្គថ្មី · គ្មានការផ្សាយពាណិជ្ជកម្ម · បិទបានគ្រប់ពេល</p>
        <div class="acts">
          <button type="button" class="btn btn-primary" autofocus @click="answer(true)">បាទ/ចាស ជូនដំណឹងខ្ញុំ</button>
          <button type="button" class="btn btn-outline" @click="answer(false)">ពេលក្រោយ</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.prompt {
  position: fixed;
  left: 50%;
  bottom: calc(var(--float-base) + 8px + var(--float-lift));
  z-index: 95;
  transition: bottom var(--dur) var(--ease-out);
  display: flex;
  gap: 12px;
  width: min(440px, calc(100% - 32px));
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-elev);
  color: var(--text);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  transform: translateX(-50%);
}

.bell {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
}

.text {
  display: grid;
  gap: 6px;
}

strong {
  color: var(--text-strong);
}

p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.rise-enter-active,
.rise-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.rise-enter-from,
.rise-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

</style>
