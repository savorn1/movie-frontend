<script setup lang="ts">
import { SERIES_UNLOCK_PRICE, type Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie; ep: number }>()
const emit = defineEmits<{ unlocked: [] }>()

const { unlockSeries } = useLibrary()
const { show } = useToast()

const paying = ref(false)
const isDev = import.meta.dev

// KHQR isn't connected yet; the dev-only button lets you test the unlocked flow.
function simulateUnlock() {
  unlockSeries(props.movie.id)
  show(`បានដោះសោ “${props.movie.title}”`)
  emit('unlocked')
}
</script>

<template>
  <div class="wall" role="dialog" aria-modal="false" aria-labelledby="wall-title" @click.stop>
    <div class="card">
      <span class="lock"><AppIcon name="lock" :size="22" solid /></span>
      <h2 id="wall-title">វគ្គ {{ kh(ep) }} ជាវគ្គ VIP</h2>
      <p class="lead">អ្នកបានមើលវគ្គឥតគិតថ្លៃ ១–{{ kh(movie.freeEpisodes) }} ហើយ។ ដោះសោដើម្បីដឹងរឿងបន្ត។</p>

      <div class="options">
        <button type="button" class="option primary" @click="paying = true">
          <span class="o-head">
            <strong>ដោះសោរឿងនេះ</strong>
            <span class="price">${{ SERIES_UNLOCK_PRICE }}</span>
          </span>
          <span class="o-sub">គ្រប់វគ្គទាំង {{ kh(movie.episodes) }} នៃរឿងនេះ · បង់ម្តង</span>
        </button>
        <NuxtLink to="/vip" class="option">
          <span class="o-head">
            <strong>VIP គ្រប់រឿង</strong>
            <span class="price">$1.99<small>/ខែ</small></span>
          </span>
          <span class="o-sub">ដោះសោរាល់រឿង VIP · Full HD</span>
        </NuxtLink>
      </div>

      <div v-if="paying" class="khqr" role="status">
        <p>ការបង់ប្រាក់តាម KHQR មិនទាន់ដំណើរការនៅឡើយទេ។</p>
        <button v-if="isDev" type="button" class="btn btn-primary" @click="simulateUnlock">
          សាកល្បងដោះសោ (dev)
        </button>
      </div>

      <NuxtLink :to="`/watch/${movie.id}/${movie.freeEpisodes}`" class="back">
        ត្រឡប់ទៅវគ្គ {{ kh(movie.freeEpisodes) }}
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.wall {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
}

@media (prefers-reduced-transparency: reduce) {
  .wall {
    background: rgba(0, 0, 0, 0.92);
    backdrop-filter: none;
  }
}

.card {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(420px, 100%);
  text-align: center;
}

.lock {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
}

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.lead {
  margin: 0 0 4px;
  color: rgba(255, 255, 255, 0.85);
}

.options {
  display: grid;
  gap: 10px;
  width: 100%;
}

.option {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-align: left;
}

.option:hover {
  background: rgba(255, 255, 255, 0.14);
}

.option.primary {
  border-color: var(--accent);
  background: rgba(255, 209, 1, 0.12);
}

.o-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.price {
  font-size: 20px;
  font-weight: 700;
}

.price small {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 500;
}

.o-sub {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.khqr {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.khqr p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.back {
  min-height: 44px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
