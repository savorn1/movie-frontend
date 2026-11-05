<script setup lang="ts">
/*
 * Home: the running promotions as a slim strip each ("Series X is free · 1 day 4 h left", "+30% coins
 * on every pack"). Dismissed per promotion for this visit.
 */
const { list, load } = usePromotions()
onMounted(load)
const hidden = ref<string[]>([])
const shown = computed(() => list.value.filter(p => !hidden.value.includes(p.title + p.endsAt) && Date.parse(p.endsAt) > Date.now()))
</script>

<template>
  <div v-if="shown.length" class="promos">
    <div v-for="p in shown" :key="p.title + p.endsAt" class="promo" :class="p.kind === 'FREE_SERIES' ? 'free' : 'coins'">
      <AppIcon :name="p.kind === 'FREE_SERIES' ? 'play' : 'sparkle'" :size="18" class="ic" />
      <NuxtLink :to="p.kind === 'FREE_SERIES' ? `/detail/${p.seriesId}` : '/library#wallet'" class="text">
        <strong>{{ p.title }}</strong>
        <span v-if="p.kind === 'FREE_SERIES'">“{{ p.seriesTitle }}” មើលឥតគិតថ្លៃគ្រប់វគ្គ</span>
        <span v-else>កាក់បន្ថែម +{{ kh(p.bonusPercent ?? 0) }}% លើគ្រប់កញ្ចប់</span>
      </NuxtLink>
      <span class="left">នៅសល់ <PromoCountdown :until="p.endsAt" /></span>
      <button type="button" class="x" aria-label="លាក់" @click="hidden.push(p.title + p.endsAt)">
        <AppIcon name="close" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.promos {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.promo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 6px 6px 6px 14px;
  border-radius: 14px;
  color: #fff;
  animation: rise var(--dur-slow) var(--ease-out);
}

.promo.free {
  background: linear-gradient(110deg, #c2185b, #e5484d 60%, #ff7a45);
}

.promo.coins {
  background: linear-gradient(110deg, #8a5a00, #d49b00 55%, #ffcc33);
  color: #1a1400;
}

.ic {
  flex: none;
}

.text {
  display: grid;
  flex: 1;
  min-width: 0;
  color: inherit;
}

.text strong {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text span {
  overflow: hidden;
  font-size: 13px;
  opacity: 0.92;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.left {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.x {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: inherit;
}

/* Phones: the countdown stays (it's the point), just tighter */
@media (max-width: 480px) {
  .promo {
    gap: 8px;
    padding-left: 12px;
  }

  .left {
    padding: 3px 8px;
  }

  .x {
    width: 32px;
  }
}
</style>
