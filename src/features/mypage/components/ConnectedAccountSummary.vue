<script setup>
import { CircleCheck } from '@lucide/vue'

import BrokerLogo from '@/shared/components/BrokerLogo.vue'

defineProps({
  brokerCode: {
    type: String,
    default: '',
  },
  brokerName: {
    type: String,
    required: true,
  },
  accountCount: {
    type: Number,
    required: true,
  },
  holdingsCount: {
    type: Number,
    required: true,
  },
  totalValuation: {
    type: Number,
    required: true,
  },
})

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`
}
</script>

<template>
  <section class="account-summary" aria-label="연결 계좌 요약">
    <div class="account-summary__broker">
      <BrokerLogo :broker-code="brokerCode" :broker-name="brokerName" :size="40" />
      <span>
        <strong>{{ brokerName }}</strong>
        <small>연결 계좌 {{ accountCount }}개</small>
      </span>
      <CircleCheck class="account-summary__check" :size="21" aria-hidden="true" />
    </div>

    <div class="account-summary__valuation">
      <span>보유 종목 {{ holdingsCount }}개 · 총 평가금액</span>
      <strong>{{ formatCurrency(totalValuation) }}</strong>
    </div>
  </section>
</template>

<style scoped>
.account-summary {
  display: grid;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgb(0 0 0 / 4%);
}

.account-summary__valuation,
.account-summary__broker {
  display: flex;
  align-items: center;
}

.account-summary__valuation {
  justify-content: space-between;
}

.account-summary__broker {
  display: grid;
  grid-template-columns: 40px 1fr 24px;
  gap: 7px;
}

.account-summary__broker > span:last-child {
  display: grid;
  gap: 1px;
}

.account-summary__broker strong {
  color: var(--color-heading);
  font-size: var(--font-size-body);
}

.account-summary__broker small,
.account-summary__valuation > span {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.account-summary__check {
  color: #168c89;
}

.account-summary__valuation {
  padding-top: 8px;
  border-top: 1px solid var(--color-border-subtle);
}

.account-summary__valuation strong {
  color: var(--color-heading);
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
}
</style>
