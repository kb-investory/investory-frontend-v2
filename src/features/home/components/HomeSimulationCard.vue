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
  display: flex;
  min-height: 86px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  color: #ffffff;
  background: #263a43;
}

.simulation-card__monkey {
  display: inline-flex;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: #0b8f8b;
}

.simulation-card__copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 4px;
}

.simulation-card__copy strong {
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
}

.simulation-card__copy small {
  color: #bfd0d5;
  font-size: 10.5px;
  line-height: 1.35;
}

.simulation-card__arrow {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #0b63ce;
  background: #ffffff;
}

.simulation-card:focus-visible {
  outline: 2px solid #0b8f8b;
  outline-offset: 2px;
}
</style>
