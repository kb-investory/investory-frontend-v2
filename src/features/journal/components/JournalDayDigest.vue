<script setup>
import { Frown, Laugh, Lightbulb, Meh, Smile } from '@lucide/vue'
import { computed } from 'vue'

import JournalTradeDetailCard from '@/features/journal/components/JournalTradeDetailCard.vue'
import AppIcon from '@/shared/components/AppIcon.vue'

const props = defineProps({
  entry: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit'])

const moodOptions = {
  ANXIOUS: { label: '불안', sentence: '오늘은 마음이 흔들린 하루였어요', icon: Frown },
  CAUTIOUS: { label: '경계', sentence: '오늘은 신중하게 살핀 하루였어요', icon: Meh },
  CALM: { label: '차분', sentence: '오늘은 차분한 하루였어요', icon: Smile },
  CONFIDENT: { label: '확신', sentence: '오늘은 확신을 지킨 하루였어요', icon: Laugh },
}

const journal = computed(() => props.entry.journal)
const trades = computed(() => props.entry.trades ?? [])
const selectedDate = computed(() => new Date(`${props.entry.journalDate}T00:00:00`))
const mood = computed(() => moodOptions[journal.value?.marketMood] ?? moodOptions.CALM)
const dateNumber = computed(() => selectedDate.value.getDate())
const dateDescription = computed(() => {
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'long' }).format(selectedDate.value)
  return `${selectedDate.value.getMonth() + 1}월 · ${weekday}`
})
const writtenTime = computed(() => {
  const timestamp = journal.value?.updatedAt ?? journal.value?.createdAt
  if (!timestamp) {
    return '작성 시각 없음'
  }

  const time = new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
  return `${time} 기록`
})

function getTradeSide(trade) {
  return trade.tradeSide ?? trade.tradeType
}

function getTradeAmount(trade) {
  return Number(trade.unitPrice ?? trade.price ?? 0) * Number(trade.quantity ?? 0)
}

const tradeSummary = computed(() => {
  return trades.value.reduce(
    (summary, trade) => {
      const amount = getTradeAmount(trade)
      if (getTradeSide(trade) === 'SELL') {
        summary.sell += amount
      } else {
        summary.buy += amount
      }
      summary.net = summary.sell - summary.buy
      return summary
    },
    { buy: 0, sell: 0, net: 0 },
  )
})

function formatCurrency(value, { signed = false } = {}) {
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${Number(value).toLocaleString('ko-KR')}원`
}
</script>

<template>
  <article class="journal-digest">
    <header class="journal-digest__header">
      <div class="journal-digest__date">
        <strong>{{ dateNumber }}</strong>
        <div>
          <span>{{ dateDescription }}</span>
          <time>{{ writtenTime }}</time>
        </div>
      </div>

      <button
        v-if="journal.isEditable !== false"
        class="journal-digest__edit"
        type="button"
        @click="emit('edit')"
      >
        <AppIcon name="pencil" :size="13" />
        <span>수정</span>
      </button>
    </header>

    <section class="journal-digest__reflection" aria-label="선택 날짜 판단 기록">
      <div class="journal-digest__reflection-meta">
        <span>오늘의 판단 기록</span>
        <span class="journal-digest__mood">
          <component :is="mood.icon" :size="16" :stroke-width="1.8" aria-hidden="true" />
          {{ mood.label }}
        </span>
      </div>
      <h2>{{ mood.sentence }}</h2>
      <p>{{ journal.marketThought }}</p>
    </section>

    <div class="journal-digest__divider">
      <span>오늘의 거래와 판단 근거</span>
      <AppIcon name="chevron-down" :size="14" />
    </div>

    <dl class="journal-digest__summary" aria-label="선택 날짜 거래 요약">
      <div>
        <dt>총 매수</dt>
        <dd class="journal-digest__value--buy">{{ formatCurrency(tradeSummary.buy) }}</dd>
      </div>
      <div>
        <dt>총 매도</dt>
        <dd class="journal-digest__value--sell">{{ formatCurrency(tradeSummary.sell) }}</dd>
      </div>
      <div>
        <dt>순현금</dt>
        <dd
          :class="{
            'journal-digest__value--positive': tradeSummary.net >= 0,
            'journal-digest__value--negative': tradeSummary.net < 0,
          }"
        >
          {{ formatCurrency(tradeSummary.net, { signed: true }) }}
        </dd>
      </div>
    </dl>

    <section class="journal-digest__trades" aria-labelledby="trade-records-title">
      <header>
        <h3 id="trade-records-title">거래별 판단 기록</h3>
        <span>{{ trades.length }} TRADES</span>
      </header>

      <div v-if="trades.length" class="journal-digest__trade-list">
        <JournalTradeDetailCard v-for="trade in trades" :key="trade.tradeId" :trade="trade" />
      </div>

      <div v-else class="journal-digest__empty-trades">
        <Lightbulb :size="18" :stroke-width="1.8" aria-hidden="true" />
        <p>이날 기록된 거래가 없어요.</p>
      </div>
    </section>
  </article>
</template>

<style scoped>
.journal-digest {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.journal-digest__header {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
}

.journal-digest__date {
  display: flex;
  align-items: center;
  gap: 7px;
}

.journal-digest__date > strong {
  color: var(--brand-teal-deep, #087f7c);
  font-family: var(--font-mono);
  font-size: 26px;
  line-height: 1;
}

.journal-digest__date > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.journal-digest__date span,
.journal-digest__date time {
  font-family: var(--font-sans);
  font-size: 10px;
  line-height: 15px;
}

.journal-digest__date span {
  color: var(--text-primary, #181817);
  font-weight: 700;
}

.journal-digest__date time {
  color: var(--text-tertiary, #94948e);
}

.journal-digest__edit {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid #dce6e9;
  border-radius: 12px;
  color: var(--text-secondary, #666662);
  background: #ffffff;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.journal-digest__edit:hover {
  color: var(--brand-teal-deep, #087f7c);
  background: var(--brand-mist, #f5fbfb);
}

.journal-digest__edit:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: 2px;
}

.journal-digest__reflection {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  gap: 7px;
  padding: 11px 12px;
  border-radius: 12px;
  color: #ffffff;
  background: var(--slate-strong, #263a43);
}

.journal-digest__reflection-meta {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  color: #5fd3ce;
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 700;
}

.journal-digest__mood {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-primary, #181817);
  background: #c8f3ee;
  font-family: var(--font-heading);
}

.journal-digest__mood :deep(svg) {
  color: #3976d9;
}

.journal-digest__reflection h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 17px;
  line-height: 23px;
}

.journal-digest__reflection p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.journal-digest__divider {
  display: flex;
  min-height: 28px;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #ecece7;
  color: var(--text-secondary, #666662);
  font-family: var(--font-heading);
  font-size: 10px;
  font-weight: 700;
}

.journal-digest__divider :deep(svg) {
  color: var(--text-tertiary, #94948e);
}

.journal-digest__summary {
  display: grid;
  min-height: 64px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  margin: 0;
  padding: 9px 0;
  border: 1px solid #d8e9e8;
  border-radius: 12px;
  background: var(--brand-mist, #f5fbfb);
}

.journal-digest__summary > div {
  display: flex;
  min-width: 0;
  min-height: 35px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
}

.journal-digest__summary > div + div {
  border-left: 1px solid var(--border-default, #e5e5e0);
}

.journal-digest__summary dt {
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-heading);
  font-size: 10px;
}

.journal-digest__summary dd {
  overflow: hidden;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journal-digest__value--buy,
.journal-digest__value--negative {
  color: #e34b4b;
}

.journal-digest__value--sell {
  color: #3976d9;
}

.journal-digest__value--positive {
  color: #23855a;
}

.journal-digest__trades {
  display: grid;
  gap: 6px;
}

.journal-digest__trades > header {
  display: flex;
  height: 20px;
  align-items: center;
  justify-content: space-between;
}

.journal-digest__trades h3 {
  margin: 0;
  color: var(--text-primary, #181817);
  font-family: var(--font-heading);
  font-size: 12px;
}

.journal-digest__trades > header span {
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.6px;
}

.journal-digest__trade-list {
  display: grid;
  gap: 6px;
}

.journal-digest__empty-trades {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #d8e9e8;
  border-radius: 12px;
  color: var(--text-tertiary, #94948e);
  background: var(--brand-mist, #f5fbfb);
}

.journal-digest__empty-trades p {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 11px;
}
</style>
