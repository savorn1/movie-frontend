<script setup lang="ts">
/*
 * First visit to the home page: "What do you like?" Pick up to 3 genres and the "For you" row fits them
 * straight away. Shown once (answered or skipped), only to someone with nothing watched or saved yet.
 */
const { prefs, history, favorites } = useLibrary()
const { movies } = useCatalog()
const hydrated = useHydrated()
const picked = ref<string[]>([])
const MAX = 3

// The genres the catalog actually has, most common first
const genres = computed(() => {
  const count = new Map<string, number>()
  for (const m of movies.value) for (const g of m.genres) count.set(g, (count.get(g) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([g]) => g)
})

const show = computed(() => hydrated.value && !prefs.value.onboarded && !history.value.length && !favorites.value.length && genres.value.length >= 2)

function toggle(g: string) {
  if (picked.value.includes(g)) picked.value = picked.value.filter(x => x !== g)
  else if (picked.value.length < MAX) picked.value = [...picked.value, g]
  haptic('tap')
}

function done(save: boolean) {
  prefs.value = { ...prefs.value, onboarded: true, genres: save ? picked.value : [] }
}
</script>

<template>
  <section v-if="show" class="picker" aria-labelledby="picker-title">
    <h2 id="picker-title">អ្នកចូលចិត្តរឿងបែបណា?</h2>
    <p>ជ្រើសរើសដល់ទៅ {{ kh(MAX) }} ប្រភេទ ដើម្បីទទួលការណែនាំសម្រាប់អ្នក</p>
    <div class="chips" role="group" aria-label="ប្រភេទរឿង">
      <button
        v-for="g in genres"
        :key="g"
        type="button"
        :aria-pressed="picked.includes(g)"
        :disabled="!picked.includes(g) && picked.length >= MAX"
        @click="toggle(g)"
      >
        <AppIcon v-if="picked.includes(g)" name="check" :size="14" />{{ g }}
      </button>
    </div>
    <div class="acts">
      <button type="button" class="btn btn-primary" :disabled="!picked.length" @click="done(true)">
        {{ picked.length ? `បង្ហាញរឿងសម្រាប់ខ្ញុំ (${kh(picked.length)})` : 'ជ្រើសយ៉ាងហោចណាស់មួយ' }}
      </button>
      <button type="button" class="skip" @click="done(false)">រំលង</button>
    </div>
  </section>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
  padding: 18px;
  border: 1px solid var(--accent);
  border-radius: 16px;
  background: var(--bg-elev);
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
}

p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 14px;
}

.chips button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 700;
}

.chips button:disabled {
  opacity: 0.45;
}

.acts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.acts .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skip {
  min-height: 44px;
  padding: 0 8px;
  color: var(--text-muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
