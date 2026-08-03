<script setup>
import { Landmark } from '@lucide/vue'

defineProps({
  brokerName: {
    type: String,
    required: true,
  },
  accountCount: {
    type: Number,
    required: true,
  },
  holdingCount: {
    type: Number,
    required: true,
  },
  totalValuation: {
    type: Number,
    required: true,
  },
})

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR').format(value)
}
</script>

<template>
  <section class="connection-summary" aria-label="연결된 계좌 요약">
    <span class="connection-summary__icon">
      <Landmark :size="20" />
    </span>
    <div>
      <p>연결된 투자 자산</p>
      <strong>{{ brokerName }} · 계좌 {{ accountCount }}개</strong>
      <span>보유 종목 {{ holdingCount }}개 · {{ formatCurrency(totalValuation) }}원</span>
    </div>
  </section>
</template>

<style scoped>
.connection-summary {
  display: grid;
  grid-template-columns: 42px 1fr;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: var(--slate-strong);
  color: #ffffff;
}

.connection-summary__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 10px;
  background: var(--brand-teal-soft);
  color: var(--brand-teal-deep);
}

.connection-summary > div {
  display: grid;
  gap: 3px;
}

.connection-summary p {
  margin: 0;
  color: #dce6e9;
  font-size: 11px;
}

.connection-summary strong {
  font-size: 14px;
}

.connection-summary span:last-child {
  color: #dce6e9;
  font-size: 12px;
}
</style>
