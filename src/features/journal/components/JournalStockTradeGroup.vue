<script setup>
import { computed } from 'vue'

const props = defineProps({
  dateKey: {
    type: String,
    required: true,
  },
  trades: {
    type: Array,
    default: () => [],
  },
})

const dayLabel = computed(() => props.dateKey.slice(-2))

function sideLabel(side) {
  return side === 'BUY' ? '매수' : '매도'
}

function formatTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function formatCurrency(value) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}
</script>

<template>
  <article class="trade-group">
    <div class="trade-group__date" :aria-label="`${dateKey}, 거래 ${trades.length}건`">
      <strong>{{ dayLabel }}</strong>
      <span>{{ trades.length }}건</span>
    </div>

    <div class="trade-group__list">
      <div v-for="trade in trades" :key="trade.tradeId" class="trade-group__item">
        <time :datetime="trade.tradedAt">{{ formatTime(trade.tradedAt) }}</time>

        <div class="trade-group__content">
          <div class="trade-group__summary">
            <span
              class="trade-group__dot"
              :class="`trade-group__dot--${trade.tradeSide.toLowerCase()}`"
              aria-hidden="true"
            />
            <strong
              class="trade-group__side"
              :class="`trade-group__side--${trade.tradeSide.toLowerCase()}`"
            >
              {{ sideLabel(trade.tradeSide) }}
            </strong>
            <span>{{ trade.quantity }}주 · {{ formatCurrency(trade.unitPrice) }}</span>
          </div>

          <div v-if="trade.note?.rationaleText" class="trade-group__rationale">
            <span aria-hidden="true" />
            <p>{{ trade.note.rationaleText }}</p>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.trade-group {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: start;
  gap: 9px;
}

.trade-group__date {
  display: flex;
  width: 44px;
  min-height: 49px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f7f8fa;
}

.trade-group__date strong {
  color: var(--text-primary, #181817);
  font-family: var(--font-mono);
  font-size: var(--font-size-title-md);
}

.trade-group__date span {
  color: var(--text-tertiary, #94948e);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.trade-group__list {
  min-width: 0;
  padding: 2px 10px;
  border: 1px solid #e4e9ea;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(38, 58, 67, 0.025);
}

.trade-group__item {
  display: grid;
  min-height: 44px;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.trade-group__item + .trade-group__item {
  border-top: 1px solid #ecece7;
}

.trade-group__item > time {
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.trade-group__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.trade-group__summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.trade-group__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}

.trade-group__dot--buy {
  background: #e34b4b;
}

.trade-group__dot--sell {
  background: #3976d9;
}

.trade-group__side {
  flex: 0 0 auto;
  font-size: var(--font-size-caption);
}

.trade-group__side--buy {
  color: #e34b4b;
}

.trade-group__side--sell {
  color: #3976d9;
}

.trade-group__summary > span:last-child {
  overflow: hidden;
  color: var(--text-secondary, #666662);
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-group__rationale {
  display: grid;
  grid-template-columns: 3px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.trade-group__rationale > span {
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: var(--brand-teal, #0b8f8b);
}

.trade-group__rationale p {
  overflow: hidden;
  margin: 0;
  color: var(--slate-primary, #384f59);
  font-size: var(--font-size-caption);
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
