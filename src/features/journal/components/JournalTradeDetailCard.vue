<script setup>
import { Lightbulb } from '@lucide/vue'
import { computed } from 'vue'

import StockLogo from '@/shared/components/StockLogo.vue'

const props = defineProps({
  trade: {
    type: Object,
    required: true,
  },
})

const tradeSide = computed(() => props.trade.tradeSide ?? props.trade.tradeType ?? 'BUY')
const isBuy = computed(() => tradeSide.value === 'BUY')
const sideLabel = computed(() => (isBuy.value ? '매수' : '매도'))
const price = computed(() => Number(props.trade.unitPrice ?? props.trade.price ?? 0))
const amount = computed(() => price.value * Number(props.trade.quantity ?? 0))
const rationale = computed(
  () => props.trade.note?.rationaleText || '이 거래의 판단 근거가 기록되지 않았어요.',
)
const tradedTime = computed(() => {
  const rawTime = props.trade.tradedAt ?? props.trade.tradeTime
  if (!rawTime) {
    return '--:--'
  }

  if (!rawTime.includes('T')) {
    return rawTime.slice(0, 5)
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(rawTime))
})

function formatCurrency(value) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}
</script>

<template>
  <article class="trade-detail-card">
    <div class="trade-detail-card__info">
      <div class="trade-detail-card__identity">
        <div class="trade-detail-card__stock">
          <StockLogo :stock="trade" :size="32" />
          <div class="trade-detail-card__stock-copy">
            <strong>{{ trade.securityName }}</strong>
            <span v-if="trade.securityCode" class="trade-detail-card__code">
              {{ trade.securityCode }}
            </span>
          </div>
          <span
            class="trade-detail-card__side"
            :class="{ 'trade-detail-card__side--sell': !isBuy }"
          >
            {{ sideLabel }}
          </span>
        </div>
        <time>{{ tradedTime }}</time>
      </div>

      <dl class="trade-detail-card__metrics">
        <div>
          <dt>{{ isBuy ? '매수가' : '매도가' }}</dt>
          <dd>{{ formatCurrency(price) }}</dd>
        </div>
        <div>
          <dt>{{ isBuy ? '매수수량' : '매도수량' }}</dt>
          <dd>{{ trade.quantity }}주</dd>
        </div>
        <div>
          <dt>거래금액</dt>
          <dd>{{ formatCurrency(amount) }}</dd>
        </div>
      </dl>
    </div>

    <div class="trade-detail-card__rationale">
      <div class="trade-detail-card__rationale-label">
        <Lightbulb :size="12" :stroke-width="1.8" aria-hidden="true" />
        <span>투자 근거</span>
      </div>
      <p>{{ rationale }}</p>
    </div>
  </article>
</template>

<style scoped>
.trade-detail-card {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e4e9ea;
  border-radius: 12px;
  background: #ffffff;
}

.trade-detail-card__rationale {
  display: flex;
  min-height: 48px;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
  padding: 9px 10px;
  border-left: 3px solid var(--brand-teal, #0b8f8b);
  border-radius: 8px;
  background: var(--brand-mist, #f5fbfb);
}

.trade-detail-card__rationale-label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--brand-teal-deep, #087f7c);
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.trade-detail-card__rationale p {
  margin: 0;
  color: var(--slate-strong, #263a43);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.trade-detail-card__info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.trade-detail-card__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.trade-detail-card__stock {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 7px;
}

.trade-detail-card__stock-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

.trade-detail-card__stock strong {
  min-width: 0;
  color: var(--text-primary, #181817);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.trade-detail-card__code {
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.2;
}

.trade-detail-card__side {
  color: #e34b4b;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 700;
  flex: 0 0 auto;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--brand-red-soft, #fff0f2);
  line-height: 1.2;
  white-space: nowrap;
  writing-mode: horizontal-tb;
}

.trade-detail-card__side--sell {
  color: #3976d9;
  background: var(--brand-blue-soft, #edf5ff);
}

.trade-detail-card__identity time {
  margin-left: 14px;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.trade-detail-card__metrics {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid #edf1f1;
}

.trade-detail-card__metrics div {
  min-width: 0;
}

.trade-detail-card__metrics dt {
  margin-bottom: 3px;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.trade-detail-card__metrics dd {
  overflow: hidden;
  margin: 0;
  color: var(--text-primary, #181817);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
