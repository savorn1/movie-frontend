<script setup lang="ts">
useHead({ title: 'សមាជិក VIP - RuengFlix' })

interface Plan {
  id: string
  name: string
  price: number
  months: number
  badge?: string
}

const plans: Plan[] = [
  { id: '1m', name: 'VIP ១ ខែ', price: 1.99, months: 1 },
  { id: '3m', name: 'VIP ៣ ខែ', price: 4.99, months: 3, badge: 'ពេញនិយម' },
  { id: '6m', name: 'VIP ៦ ខែ', price: 8.99, months: 6 },
  { id: '12m', name: 'VIP ១២ ខែ', price: 14.99, months: 12, badge: 'តម្លៃល្អបំផុត' }
]

const perks = [
  'ទស្សនាភាពយន្ត & រឿងភាគ VIP គ្រប់ភាគ',
  'កម្រិតរូបភាពច្បាស់ Full HD / 4K',
  'ដំណើរការ VIP ស្វ័យប្រវត្តិភ្លាមៗ'
]

const features = [
  { title: 'មើលភាគ VIP គ្រប់ពេលវេលា', text: 'ទទួលបានសិទ្ធិចូលទស្សនាភាគ VIP ទាំងអស់ដោយគ្មានដែនកំណត់ ជាមួយល្បឿន Stream លឿនរលូន។' },
  { title: 'បន្តសុពលភាពស្វ័យប្រវត្តិ', text: 'ការទិញគម្រោងបន្ថែម នឹងបន្តពីថ្ងៃផុតកំណត់ចាស់របស់អ្នកដោយស្វ័យប្រវត្តិ ដោយមិនបាត់បង់ថ្ងៃនៅសល់ឡើយ។' },
  { title: 'សុវត្ថិភាពខ្ពស់តាម KHQR', text: 'ទូទាត់ប្រកបដោយទំនុកចិត្ត និងសុវត្ថិភាពតាមស្តង់ដារ KHQR នៃធនាគារក្នុងប្រទេសកម្ពុជា។' }
]

const perMonth = (p: Plan) => +(p.price / p.months).toFixed(2)

// Native <dialog> gives Esc to close, a focus trap, and focus return to the opener.
const dialog = ref<HTMLDialogElement>()
const selected = ref<Plan | null>(null)

function choose(p: Plan) {
  selected.value = p
  dialog.value?.showModal()
}

const close = () => dialog.value?.close()
</script>

<template>
  <div class="page">
    <section class="hero">
      <AppIcon name="crown" :size="40" class="crown" />
      <h1 class="display">សមាជិក VIP</h1>
      <p>ដោះសោគ្រប់វគ្គ VIP · កម្រិតរូបភាព Full HD / 4K · ដំណើរការភ្លាមៗ</p>
      <span class="status">ស្ថានភាព៖ ភ្ញៀវ · មិនទាន់មាន VIP</span>
    </section>

    <section class="plans">
      <article v-for="p in plans" :key="p.id" class="plan" :class="{ featured: p.id === '3m' }">
        <span v-if="p.badge" class="badge">{{ p.badge }}</span>
        <h2>{{ p.name }}</h2>
        <div class="price"><sup>$</sup>{{ p.price }}<small>ដុល្លារ</small></div>
        <p class="per">
          ត្រឹមតែ ${{ perMonth(p) }} / ខែ<template v-if="p.months > 1"> · សន្សំសំចៃ</template>
        </p>
        <ul>
          <li v-for="perk in perks" :key="perk">
            <AppIcon name="check" :size="16" />{{ perk }}
          </li>
        </ul>
        <button type="button" class="btn" :class="p.id === '3m' ? 'btn-primary' : 'btn-outline'" @click="choose(p)">
          ជ្រើសរើស {{ p.name }}
        </button>
      </article>
    </section>

    <section class="features">
      <div v-for="f in features" :key="f.title" class="feature">
        <h3>{{ f.title }}</h3>
        <p>{{ f.text }}</p>
      </div>
    </section>

    <dialog ref="dialog" class="dialog" aria-labelledby="checkout-title" @click.self="close">
      <div v-if="selected" class="dialog-body">
        <button type="button" class="dialog-close" aria-label="បិទ" @click="close">
          <AppIcon name="close" :size="18" />
        </button>
        <h3 id="checkout-title">{{ selected.name }}</h3>
        <p class="price small"><sup>$</sup>{{ selected.price }}</p>
        <p>ការបង់ប្រាក់តាម KHQR មិនទាន់ដំណើរការនៅឡើយទេ។ សូមព្យាយាមម្តងទៀតនៅពេលក្រោយ។</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-outline" @click="close">បោះបង់</button>
          <button type="button" class="btn btn-primary" disabled>បង់ ${{ selected.price }}</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.page {
  padding: 32px;
}

.hero {
  padding: 40px 24px;
  border-radius: 20px;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 209, 1, 0.25), transparent 60%),
    linear-gradient(135deg, #2b2208, #121212);
  color: #fff;
  text-align: center;
}

.crown {
  color: var(--accent);
}

.hero h1 {
  margin: 8px 0;
  font-size: clamp(30px, 4.4vw, 44px);
}

.hero p {
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.75);
}

.status {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 13px;
}

.plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin: 28px 0;
}

.plan {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  border-radius: 16px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.plan.featured {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 12px 32px rgba(255, 209, 1, 0.08);
}

.badge {
  position: absolute;
  top: -11px;
  left: 20px;
  padding: 1px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 600;
}

.plan h2 {
  margin: 0 0 12px;
  color: var(--text-strong);
  font-size: 17px;
}

.price {
  color: var(--text-strong);
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
}

.price sup {
  margin-right: 2px;
  font-size: 18px;
}

.price small {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
}

.per {
  margin: 8px 0 16px;
  color: var(--text-muted);
  font-size: 13px;
}

.plan ul {
  flex: 1;
  margin: 0 0 20px;
  padding: 0;
  list-style: none;
}

.plan li {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.plan li svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--accent-text);
}

.plan .btn {
  width: 100%;
  height: 42px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.feature {
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elev);
}

.feature h3 {
  margin: 0 0 6px;
  color: var(--text-strong);
  font-size: 15px;
}

.feature p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.dialog {
  width: min(400px, calc(100% - 32px));
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-elev);
  color: var(--text);
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.dialog-body {
  position: relative;
  padding: 28px 24px 24px;
  text-align: center;
}

.dialog-close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--text-muted);
}

.dialog-close:hover {
  background: var(--bg-hover);
  color: var(--text-strong);
}

.dialog h3 {
  margin: 0 0 8px;
  color: var(--text-strong);
}

.dialog p {
  color: var(--text-muted);
}

.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.dialog-actions .btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.price.small {
  font-size: 32px;
}

@media (max-width: 768px) {
  .page {
    padding: 16px;
  }
}
</style>
