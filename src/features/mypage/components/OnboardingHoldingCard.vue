<script setup>
import { CircleCheck } from '@lucide/vue'

import StockLogo from '@/shared/components/StockLogo.vue'

defineProps({
  holding: {
    type: Object,
    required: true,
  },
})

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('ko-KR')
}
</script>

<template>
  <article class="holding-card">
    <CircleCheck class="holding-card__check" :size="19" aria-hidden="true" />
    <StockLogo :stock="holding" :size="36" />
    <div class="holding-card__content">
      <strong>{{ holding.securityName }}</strong>
      <span>{{ formatCurrency(holding.quantity) }}주</span>
    </div>
    <strong class="holding-card__valuation">{{ formatCurrency(holding.valuationAmount) }}원</strong>
  </article>
</template>

<style scoped>
.holding-card {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: #ffffff;
}

.holding-card__check {
  flex: 0 0 auto;
  color: #168c89;
}

.holding-card__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.holding-card__content > strong {
  overflow: hidden;
  color: var(--color-heading);
  font-size: var(--font-size-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holding-card__content > span {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.4;
}

.holding-card__valuation {
  flex: 0 0 auto;
  color: var(--slate-strong);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}
</style>
