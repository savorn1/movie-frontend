<script setup lang="ts">
import type { ThemePref } from '~/composables/useTheme'

// "menu": icon button with a small popover (header). "segmented": inline control (Me page).
withDefaults(defineProps<{ variant?: 'menu' | 'segmented' }>(), { variant: 'menu' })

const { pref, resolved, setTheme } = useTheme()
const hydrated = useHydrated()

const options: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'system', label: 'ស្វ័យប្រវត្តិ', icon: 'monitor' },
  { value: 'light', label: 'ភ្លឺ', icon: 'sun' },
  { value: 'dark', label: 'ងងឹត', icon: 'moon' }
]

// Segmented variant: "Automatic" shows what it currently resolves to (known only after hydration)
const segmentOptions = computed(() => options.map(o => ({
  ...o,
  sub: o.value === 'system' && hydrated.value ? (resolved.value === 'light' ? 'ភ្លឺ' : 'ងងឹត') : undefined
})))
const segmentModel = computed({ get: () => pref.value, set: (v: ThemePref) => setTheme(v) })

const id = useId()
const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const items = ref<HTMLButtonElement[]>([])

function choose(value: ThemePref) {
  setTheme(value)
  open.value = false
  trigger.value?.focus()
}

async function toggleMenu() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    const i = options.findIndex(o => o.value === pref.value)
    items.value[Math.max(0, i)]?.focus()
  }
}

// Menu keyboard: Esc closes, arrows move between items
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) {
    open.value = false
    trigger.value?.focus()
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
  const list = items.value
  const i = list.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  e.preventDefault()
  const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
  const next = list[(i + step + list.length) % list.length]!
  next.focus()
}

function onClickOutside(e: MouseEvent) {
  if (open.value && !root.value?.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <SegmentedControl v-if="variant === 'segmented'" v-model="segmentModel" :options="segmentOptions" label="រូបរាង" />

  <!-- Menu: icon button + popover -->
  <div v-else ref="root" class="menu-wrap" @keydown="onKey">
    <button
      ref="trigger"
      type="button"
      class="trigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="`${id}-menu`"
      :aria-label="`រូបរាង: ${options.find(o => o.value === pref)?.label}`"
      @click="toggleMenu"
    >
      <!-- The server can't know what "system" resolves to, so the live icon is client-only -->
      <ClientOnly>
        <AppIcon :name="resolved === 'light' ? 'sun' : 'moon'" :size="20" />
        <template #fallback>
          <AppIcon :name="pref === 'light' ? 'sun' : pref === 'dark' ? 'moon' : 'monitor'" :size="20" />
        </template>
      </ClientOnly>
    </button>
    <Transition name="pop">
      <div v-if="open" :id="`${id}-menu`" class="menu" role="menu" aria-label="រូបរាង">
        <button
          v-for="o in options"
          :key="o.value"
          ref="items"
          type="button"
          role="menuitemradio"
          :aria-checked="pref === o.value"
          @click="choose(o.value)"
        >
          <AppIcon :name="o.icon" :size="18" />
          <span>{{ o.label }}</span>
          <AppIcon v-if="pref === o.value" name="check" :size="16" class="tick" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ---- Menu ---- */
.menu-wrap {
  position: relative;
}

.trigger {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: inherit;
}

.trigger:hover,
.trigger[aria-expanded='true'] {
  background: var(--bg-hover);
}

.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 70;
  display: grid;
  min-width: 190px;
  padding: 6px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
}

.menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  color: var(--text);
  text-align: left;
}

.menu button:hover,
.menu button:focus-visible {
  background: var(--bg-hover);
}

.menu button[aria-checked='true'] {
  color: var(--text-strong);
  font-weight: 600;
}

.tick {
  margin-left: auto;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
