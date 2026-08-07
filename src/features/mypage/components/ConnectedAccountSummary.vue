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
    <div class="account-summary__top">
      <div class="account-summary__broker">
        <span class="account-summary__icon">
          <Landmark :size="15" />
        </span>
        <span>
          <strong>{{ brokerName }}</strong>
          <small>연결 계좌 {{ accountCount }}개</small>
        </span>
      </div>
      <span class="account-summary__badge">{{ holdingsCount }}종목</span>
    </div>

    <div class="account-summary__valuation">
      <span>총 평가금액</span>
      <strong>{{ formatCurrency(totalValuation) }}</strong>
    </div>
  </section>
</template>

<style scoped>
.account-summary {
  display: grid;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid var(--slate-strong);
  border-radius: 8px;
  background: var(--slate-strong);
  box-shadow: 0 4px 12px rgb(0 0 0 / 4%);
}

.account-summary__top,
.account-summary__valuation,
.account-summary__broker {
  display: flex;
  align-items: center;
}

.account-summary__top,
.account-summary__valuation {
  justify-content: space-between;
}

.account-summary__broker {
  gap: 7px;
}

.account-summary__broker > span:last-child {
  display: grid;
  gap: 1px;
}

.account-summary__broker strong {
  color: #ffffff;
  font-size: var(--font-size-caption);
}

.account-summary__broker small,
.account-summary__valuation > span {
  color: #dce6e9;
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.account-summary__icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: var(--brand-teal);
  color: var(--slate-strong);
}

.account-summary__badge {
  padding: 4px 8px;
  border-radius: 6px;
  background: rgb(255 255 255 / 9%);
  color: #dce6e9;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.account-summary__valuation {
  padding-top: 8px;
  border-top: 1px solid rgb(255 255 255 / 14%);
}

.account-summary__valuation strong {
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
}
</style>
