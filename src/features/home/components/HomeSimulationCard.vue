<script setup>
import { ArrowUpRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import MonkeyImage from '@/shared/components/MonkeyImage.vue'

defineProps({
  to: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <RouterLink class="simulation-card" :to="to">
    <span class="simulation-card__monkey">
      <MonkeyImage :size="33" />
    </span>

    <span class="simulation-card__copy">
      <strong>같은 날, 같은 돈으로 다시 투자한다면?</strong>
      <small>실제 나와 투자봇의 선택을 비교해요</small>
    </span>

    <span class="simulation-card__arrow" aria-hidden="true">
      <ArrowUpRight :size="19" :stroke-width="2" />
    </span>
  </RouterLink>
</template>

<style scoped>
.simulation-card {
  position: relative;
  overflow: hidden;
  display: flex;
  min-height: 104px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(43, 226, 217, 0.28);
  border-radius: 22px;
  color: #ffffff;
  background:
    radial-gradient(circle at 76% 18%, rgba(26, 215, 205, 0.18), transparent 28%),
    linear-gradient(145deg, #06323c, #021b24);
  box-shadow: 0 12px 25px rgba(3, 38, 48, 0.18);
}

.simulation-card::after {
  position: absolute;
  right: 48px;
  bottom: -28px;
  width: 120px;
  height: 72px;
  border-top: 2px solid rgba(52, 229, 220, 0.25);
  transform: skewY(-18deg);
  content: '';
}

.simulation-card__monkey {
  display: inline-flex;
  z-index: 1;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(80, 237, 229, 0.4);
  border-radius: 18px;
  background: linear-gradient(145deg, #0b8f8b, #045565);
  box-shadow: 0 0 18px rgba(42, 221, 212, 0.22);
}

.simulation-card__copy {
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
}

.simulation-card__copy strong {
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
  line-height: 1.35;
}

.simulation-card__copy small {
  color: #bfd0d5;
  font-size: var(--font-size-caption);
  line-height: 1.35;
}

.simulation-card__arrow {
  z-index: 1;
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #087f7c;
  background: #ffffff;
}

.simulation-card:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
