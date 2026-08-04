<script setup>
import { computed } from 'vue'

const props = defineProps({
  stockName: {
    type: String,
    required: true,
  },
  trades: {
    type: Array,
    default: () => [],
  },
  cumulativeProfitAmount: {
    type: Number,
    default: 0,
  },
})

const chronologicalTrades = computed(() =>
  [...props.trades].sort((a, b) => a.tradedAt.localeCompare(b.tradedAt)),
)

const buyCount = computed(() => props.trades.filter((trade) => trade.tradeSide === 'BUY').length)
const sellCount = computed(() => props.trades.filter((trade) => trade.tradeSide === 'SELL').length)
const journeyDays = computed(
  () => new Set(props.trades.map((trade) => trade.tradedAt.slice(0, 10))).size,
)
const totalBuyAmount = computed(() =>
  props.trades
    .filter((trade) => trade.tradeSide === 'BUY')
    .reduce((total, trade) => total + trade.quantity * trade.unitPrice, 0),
)
const totalSellAmount = computed(() =>
  props.trades
    .filter((trade) => trade.tradeSide === 'SELL')
    .reduce((total, trade) => total + trade.quantity * trade.unitPrice, 0),
)
const profitClass = computed(() => ({
  'journey-summary__metric-value--loss': props.cumulativeProfitAmount < 0,
}))

function formatCurrency(value) {
  return `${Math.abs(Number(value)).toLocaleString('ko-KR')}원`
}

function formatSignedCurrency(value) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${prefix}${formatCurrency(value)}`
}

function formatMarkerDate(value) {
  const date = new Date(value)
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <section class="journey-summary" aria-labelledby="stock-journey-title">
    <header class="journey-summary__header">
      <h2 id="stock-journey-title">나와 {{ stockName }}의 {{ journeyDays }}일</h2>
      <span>매수 {{ buyCount }} · 매도 {{ sellCount }}</span>
    </header>

    <ol v-if="chronologicalTrades.length" class="journey-summary__track" aria-label="매매 여정">
      <li
        v-for="(trade, index) in chronologicalTrades"
        :key="trade.tradeId"
        class="journey-summary__marker"
      >
        <span
          class="journey-summary__dot"
          :class="`journey-summary__dot--${trade.tradeSide.toLowerCase()}`"
          aria-hidden="true"
        />
        <time :datetime="trade.tradedAt">{{ formatMarkerDate(trade.tradedAt) }}</time>
        <small v-if="index === 0">첫 거래</small>
        <small v-else-if="index === chronologicalTrades.length - 1">최근 거래</small>
      </li>
    </ol>

    <dl class="journey-summary__metrics">
      <div>
        <dt>총 매수</dt>
        <dd class="journey-summary__metric-value--buy">
          {{ formatCurrency(totalBuyAmount) }}
        </dd>
      </div>
      <div>
        <dt>총 매도</dt>
        <dd class="journey-summary__metric-value--sell">
          {{ formatCurrency(totalSellAmount) }}
        </dd>
      </div>
      <div>
        <dt>누적 손익</dt>
        <dd :class="profitClass">{{ formatSignedCurrency(cumulativeProfitAmount) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.journey-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--slate-strong, #263a43);
  border-radius: 16px;
  color: #ffffff;
  background: var(--slate-strong, #263a43);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.journey-summary__header {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.journey-summary__header h2 {
  overflow: hidden;
  margin: 0;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journey-summary__header span {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
}

.journey-summary__track {
  position: relative;
  display: flex;
  min-height: 54px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.journey-summary__track::before {
  position: absolute;
  top: 18px;
  right: 7px;
  left: 7px;
  height: 4px;
  border-radius: 2px;
  background: var(--brand-teal, #0b8f8b);
  content: '';
}

.journey-summary__marker {
  z-index: 1;
  display: flex;
  min-width: 36px;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.journey-summary__dot {
  width: 14px;
  height: 14px;
  margin-top: 13px;
  border: 3px solid var(--brand-mist, #f5fbfb);
  border-radius: 50%;
}

.journey-summary__dot--buy {
  background: #e34b4b;
}

.journey-summary__dot--sell {
  background: #3976d9;
}

.journey-summary__marker time {
  color: rgba(255, 255, 255, 0.72);
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 600;
}

.journey-summary__marker small {
  color: rgba(255, 255, 255, 0.5);
  font-size: 8px;
  font-weight: 600;
}

.journey-summary__metrics {
  display: grid;
  min-height: 60px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
}

.journey-summary__metrics div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 3px;
}

.journey-summary__metrics div + div {
  border-left: 1px solid #ecece7;
}

.journey-summary__metrics dt {
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-heading);
  font-size: 10px;
}

.journey-summary__metrics dd {
  overflow: hidden;
  max-width: 100%;
  margin: 0;
  color: #e34b4b;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journey-summary__metrics .journey-summary__metric-value--sell,
.journey-summary__metrics .journey-summary__metric-value--loss {
  color: #3976d9;
}
</style>
