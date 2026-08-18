<script setup>
import { ArrowDownUp, CircleHelp, SquarePen } from '@lucide/vue'
import { computed, ref } from 'vue'

import JournalTradeNoteSheet from '@/features/journal/components/JournalTradeNoteSheet.vue'

const props = defineProps({
  trades: {
    type: Array,
    default: () => [],
  },
  notes: {
    type: Object,
    default: () => ({}),
  },
  sortOrder: {
    type: String,
    default: 'latest',
  },
  stepNumber: {
    type: String,
    default: '3',
  },
  histories: {
    type: Object,
    default: () => ({}),
  },
  historyLoading: {
    type: Object,
    default: () => ({}),
  },
  historyErrors: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update-note', 'toggle-sort', 'load-history', 'open-stock-history'])
const selectedTrade = ref(null)
const completedNoteCount = computed(
  () => props.trades.filter((trade) => String(props.notes[trade.tradeId] ?? '').trim()).length,
)
const selectedTradeHistoryKey = computed(() => String(Number(selectedTrade.value?.securityId)))
const selectedTradeHistory = computed(() => props.histories[selectedTradeHistoryKey.value] || [])
const selectedTradeHistoryLoading = computed(() =>
  Boolean(props.historyLoading[selectedTradeHistoryKey.value]),
)
const selectedTradeHistoryError = computed(
  () => props.historyErrors[selectedTradeHistoryKey.value] || '',
)

function updateNote(tradeId, value) {
  emit('update-note', { tradeId, value })
}

function formatTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function formatPrice(value) {
  return `${Number(value).toLocaleString('ko-KR')}원`
}

function openNoteSheet(trade) {
  selectedTrade.value = trade
  emit('load-history', trade)
}

function updateSelectedNote(value) {
  if (!selectedTrade.value) return
  updateNote(selectedTrade.value.tradeId, value)
}
</script>

<template>
  <section class="trade-timeline" aria-labelledby="trade-timeline-title">
    <header class="trade-timeline__header">
      <div class="trade-timeline__title-row">
        <span class="trade-timeline__step" aria-hidden="true">{{ stepNumber }}</span>
        <h2 id="trade-timeline-title" class="trade-timeline__title">오늘의 거래 타임라인</h2>
        <span class="trade-timeline__count">{{ trades.length }}건</span>
      </div>

      <button type="button" class="trade-timeline__sort" @click="emit('toggle-sort')">
        <ArrowDownUp :size="13" :stroke-width="1.8" aria-hidden="true" />
        {{ sortOrder === 'latest' ? '최신순' : '오래된순' }}
      </button>
    </header>

    <div class="trade-timeline__guide">
      <span class="trade-timeline__guide-icon">
        <CircleHelp :size="17" :stroke-width="1.8" aria-hidden="true" />
      </span>
      <div>
        <strong>왜 이 거래를 했나요? · {{ completedNoteCount }}/{{ trades.length }} 작성</strong>
        <p>근거 입력을 누르면 이전 판단 기록을 함께 확인할 수 있어요.</p>
      </div>
    </div>

    <div v-if="trades.length" class="trade-timeline__list">
      <article v-for="trade in trades" :key="trade.tradeId" class="trade-timeline__item">
        <time class="trade-timeline__time" :datetime="trade.tradedAt">
          {{ formatTime(trade.tradedAt) }}
        </time>

        <span
          class="trade-timeline__dot"
          :class="`trade-timeline__dot--${trade.tradeSide.toLowerCase()}`"
          aria-hidden="true"
        />

        <div class="trade-timeline__card">
          <div class="trade-timeline__trade">
            <div class="trade-timeline__security">
              <strong>{{ trade.securityName }}</strong>
              <span
                class="trade-timeline__side"
                :class="`trade-timeline__side--${trade.tradeSide.toLowerCase()}`"
              >
                {{ trade.tradeSide === 'BUY' ? '매수' : '매도' }}
              </span>
            </div>
            <span class="trade-timeline__summary">
              {{ trade.quantity }}주 · {{ formatPrice(trade.unitPrice) }}
            </span>
          </div>

          <button
            type="button"
            class="trade-timeline__note"
            :class="{ 'trade-timeline__note--empty': !notes[trade.tradeId]?.trim() }"
            :aria-label="`${trade.securityName} 거래 판단 근거 ${notes[trade.tradeId] ? '수정' : '입력'}`"
            @click="openNoteSheet(trade)"
          >
            <SquarePen :size="14" :stroke-width="1.8" aria-hidden="true" />
            <span>{{ notes[trade.tradeId]?.trim() || '판단 근거 입력하기' }}</span>
          </button>
        </div>
      </article>
    </div>

    <div v-else class="trade-timeline__empty">
      오늘 거래 내역이 없습니다. 시장에 대한 생각만 기록할 수 있어요.
    </div>
  </section>

  <JournalTradeNoteSheet
    :is-open="Boolean(selectedTrade)"
    :trade="selectedTrade"
    :model-value="selectedTrade ? (notes[selectedTrade.tradeId] ?? '') : ''"
    :history="selectedTradeHistory"
    :loading="selectedTradeHistoryLoading"
    :error="selectedTradeHistoryError"
    @close="selectedTrade = null"
    @update:model-value="updateSelectedNote"
    @retry="selectedTrade && emit('load-history', selectedTrade)"
    @open-stock-history="selectedTrade && emit('open-stock-history', selectedTrade)"
  />
</template>

<style scoped>
.trade-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trade-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trade-timeline__title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.trade-timeline__step {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #e7f7f5;
  color: var(--brand-teal-deep);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.trade-timeline__title {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.trade-timeline__count {
  padding: 3px 7px;
  border-radius: 999px;
  background: #f1f1ed;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.trade-timeline__sort {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid #d9e7e8;
  border-radius: 14px;
  background: #ffffff;
  color: var(--brand-teal-deep);
  cursor: pointer;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.trade-timeline__guide {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid #bce8e7;
  border-radius: 13px;
  background: #f2fbfb;
}

.trade-timeline__guide-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: #e1f6f5;
  color: var(--brand-teal-deep);
}

.trade-timeline__guide strong {
  color: var(--slate-strong);
  font-family: var(--font-heading);
  font-size: var(--font-size-caption);
}

.trade-timeline__guide p {
  margin: 2px 0 0;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.trade-timeline__list {
  display: flex;
  flex-direction: column;
}

.trade-timeline__item {
  position: relative;
  display: grid;
  grid-template-columns: 38px 10px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 72px;
}

.trade-timeline__item:not(:last-child)::after {
  position: absolute;
  top: 43px;
  bottom: -17px;
  left: 51px;
  width: 1px;
  background: #d9dedc;
  content: '';
}

.trade-timeline__time {
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  text-align: right;
}

.trade-timeline__dot {
  z-index: 1;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.trade-timeline__dot--buy {
  background: #e95555;
}

.trade-timeline__dot--sell {
  background: #3976d9;
}

.trade-timeline__card {
  display: grid;
  min-width: 0;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 9px;
  border: 1px solid #e1e7e7;
  border-radius: 13px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.trade-timeline__trade {
  min-width: 0;
}

.trade-timeline__security {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.trade-timeline__security strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-timeline__side {
  flex: 0 0 auto;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.trade-timeline__side--buy {
  color: #e95555;
}

.trade-timeline__side--sell {
  color: #3976d9;
}

.trade-timeline__summary {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-timeline__note {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 42px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 0;
  border-radius: 9px;
  background: #f3faf9;
  color: var(--brand-teal-deep);
  cursor: pointer;
  text-align: left;
}

.trade-timeline__note span {
  min-width: 0;
  overflow: hidden;
  color: var(--slate-strong);
  font-size: var(--font-size-caption);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-timeline__note--empty span {
  color: var(--brand-teal-deep);
}

.trade-timeline__note:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 2px rgba(11, 143, 139, 0.22);
}

.trade-timeline__empty {
  padding: 24px 16px;
  border: 1px dashed #d9e7e8;
  border-radius: 13px;
  color: var(--text-tertiary);
  font-size: var(--font-size-caption);
  line-height: 1.4;
  text-align: center;
}
</style>
