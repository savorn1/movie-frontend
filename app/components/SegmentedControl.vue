<script setup lang="ts" generic="T extends string">
export interface SegmentOption<V extends string = string> {
  value: V
  label: string
  icon?: string
  /** Small second line, e.g. what "Automatic" currently resolves to */
  sub?: string
}

const props = defineProps<{ options: SegmentOption<T>[]; label: string }>()
const model = defineModel<T>({ required: true })

const buttons = ref<HTMLButtonElement[]>([])

// Radio-group keyboard behaviour: arrows move the selection and focus together
function onKey(e: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  const i = props.options.findIndex(o => o.value === model.value)
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
  const next = (i + step + props.options.length) % props.options.length
  model.value = props.options[next]!.value
  buttons.value[next]?.focus()
}
</script>

<template>
  <div class="segmented" role="radiogroup" :aria-label="label" @keydown="onKey">
    <button
      v-for="o in options"
      :key="o.value"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="model === o.value"
      :tabindex="model === o.value ? 0 : -1"
      @click="model = o.value"
    >
      <AppIcon v-if="o.icon" :name="o.icon" :size="18" />
      <span>{{ o.label }}</span>
      <span v-if="o.sub" class="sub">{{ o.sub }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--bg-elev-2);
}

.segmented button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 64px;
  padding: 6px 8px;
  border-radius: 10px;
  color: var(--text-muted);
  font-weight: 600;
}

.segmented button:hover {
  color: var(--text-strong);
}

.segmented button[aria-checked='true'] {
  background: var(--bg-elev);
  color: var(--text-strong);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.sub {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 400;
}
</style>
