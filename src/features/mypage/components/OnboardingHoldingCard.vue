<script setup>
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
    <span
      class="holding-card__mark"
      :class="`holding-card__mark--${holding.markVariant}`"
      aria-hidden="true"
    >
      {{ holding.mark }}
    </span>
    <div class="holding-card__content">
      <strong>{{ holding.securityName }}</strong>
      <div class="holding-card__details">
        <span>
          {{ formatCurrency(holding.quantity) }}주 · 평단 {{ formatCurrency(holding.avgCost) }}원
        </span>
        <span>평가금액 {{ formatCurrency(holding.valuationAmount) }}원</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.holding-card {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  background: #ffffff;
}

.holding-card__mark {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 11px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.holding-card__mark--samsung {
  background: #1428a0;
}

.holding-card__mark--sk {
  background: #f05a28;
  font-size: 10px;
}

.holding-card__mark--tiger {
  background: #17365d;
}

.holding-card__mark--kakao {
  background: #fee500;
  color: #181600;
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
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holding-card__details {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  white-space: nowrap;
}

.holding-card__details span {
  color: var(--color-text-muted);
  font-size: 9.5px;
  font-weight: 500;
  line-height: 13px;
}

.holding-card__details span:last-child {
  color: var(--slate-strong);
  font-family: var(--font-mono);
  font-weight: 700;
}

@media (max-width: 360px) {
  .holding-card__details {
    display: grid;
    gap: 1px;
    white-space: normal;
  }
}
</style>
