<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalStockJourneySummary from '@/features/journal/components/JournalStockJourneySummary.vue'
import JournalStockTradeGroup from '@/features/journal/components/JournalStockTradeGroup.vue'
import { useJournalStockTimelineStore } from '@/features/journal/stores/journalStockTimelineStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import StockLogo from '@/shared/components/StockLogo.vue'

const FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'buy', label: '매수' },
  { value: 'sell', label: '매도' },
  { value: 'with-note', label: '근거 있음' },
]

const route = useRoute()
const router = useRouter()
const timelineStore = useJournalStockTimelineStore()
const { timeline, isLoading, error } = storeToRefs(timelineStore)

const activeFilter = ref('all')
const securityCode = computed(() => String(route.params.securityCode ?? ''))
const stock = computed(() => timeline.value?.security ?? null)
const holding = computed(() => timeline.value?.holding ?? null)
const trades = computed(() => timeline.value?.trades ?? [])

const periodLabel = computed(() => {
  if (!trades.value.length) {
    return '-'
  }

  const latestTrade = [...trades.value].sort((a, b) => b.tradedAt.localeCompare(a.tradedAt))[0]
  const date = new Date(latestTrade.tradedAt)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
})

const holdingPeriodLabel = computed(() => {
  if (!holding.value?.firstPurchasedAt) {
    return '-'
  }

  const startDate = new Date(`${holding.value.firstPurchasedAt}T00:00:00`)
  const today = new Date()
  const totalMonths = Math.max(
    0,
    (today.getFullYear() - startDate.getFullYear()) * 12 + today.getMonth() - startDate.getMonth(),
  )
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (!years) {
    return `${months}개월`
  }

  return months ? `${years}년 ${months}개월` : `${years}년`
})

const firstPurchaseLabel = computed(() => {
  if (!holding.value?.firstPurchasedAt) {
    return '-'
  }

  return holding.value.firstPurchasedAt.replaceAll('-', '.')
})

const filteredTrades = computed(() => {
  if (activeFilter.value === 'buy') {
    return trades.value.filter((trade) => trade.tradeSide === 'BUY')
  }

  if (activeFilter.value === 'sell') {
    return trades.value.filter((trade) => trade.tradeSide === 'SELL')
  }

  if (activeFilter.value === 'with-note') {
    return trades.value.filter((trade) => Boolean(trade.note?.rationaleText))
  }

  return trades.value
})

const groupedTrades = computed(() => {
  const groups = new Map()

  filteredTrades.value.forEach((trade) => {
    const dateKey = trade.tradedAt.slice(0, 10)
    const group = groups.get(dateKey) ?? []
    group.push(trade)
    groups.set(dateKey, group)
  })

  return [...groups.entries()].map(([dateKey, dateTrades]) => ({
    dateKey,
    trades: dateTrades,
  }))
})

function goToSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}

async function loadTimeline() {
  activeFilter.value = 'all'

  try {
    await timelineStore.fetchTimeline(securityCode.value)
  } catch {
    // 스토어의 error 상태를 화면에서 안내합니다.
  }
}

watch(securityCode, loadTimeline, { immediate: true })
</script>

<template>
  <section class="stock-journal-page">
    <header class="stock-journal-page__app-bar">
      <button type="button" aria-label="검색 결과로 돌아가기" @click="goToSearch">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <h1>종목 거래 일지</h1>
      <span aria-hidden="true" />
    </header>

    <main v-if="isLoading" class="stock-journal-page__state" aria-label="불러오는 중">
      <BaseLoading />
      <p>종목 거래 일지를 불러오고 있어요.</p>
    </main>

    <main v-else-if="error" class="stock-journal-page__state" role="alert">
      <AppIcon name="triangle-alert" :size="24" />
      <h2>종목 거래 일지를 불러오지 못했어요</h2>
      <p>{{ error }}</p>
      <div class="stock-journal-page__state-actions">
        <button type="button" @click="loadTimeline">다시 시도</button>
        <button type="button" class="stock-journal-page__state-secondary" @click="goToSearch">
          종목 다시 검색
        </button>
      </div>
    </main>

    <main v-else-if="timeline && stock" class="stock-journal-page__content">
      <section class="stock-journal-page__stock-header" aria-label="선택 종목 정보">
        <div class="stock-journal-page__identity">
          <StockLogo :stock="stock" :size="46" />
          <div>
            <h2>{{ stock.securityName }}</h2>
            <p>{{ stock.securityCode }} · {{ stock.marketType }}</p>
          </div>
        </div>
        <span>{{ periodLabel }}</span>
      </section>

      <section class="stock-journal-page__holding" aria-label="보유 기간 요약">
        <div class="stock-journal-page__holding-main">
          <span class="stock-journal-page__holding-icon">
            <AppIcon name="calendar-range" :size="18" />
          </span>
          <div>
            <span>보유 기간</span>
            <strong>{{ holdingPeriodLabel }}</strong>
          </div>
        </div>
        <div class="stock-journal-page__holding-detail">
          <span>첫 매수 {{ firstPurchaseLabel }}</span>
          <strong>현재 {{ holding.currentQuantity }}주 보유</strong>
        </div>
      </section>

      <JournalStockJourneySummary
        :stock-name="stock.securityName"
        :trades="trades"
        :cumulative-profit-amount="holding.cumulativeProfitAmount"
      />

      <div class="stock-journal-page__filters" aria-label="거래 유형 필터">
        <button
          v-for="filter in FILTERS"
          :key="filter.value"
          type="button"
          :class="{ 'stock-journal-page__filter--active': activeFilter === filter.value }"
          :aria-pressed="activeFilter === filter.value"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <section class="stock-journal-page__timeline" aria-labelledby="stock-timeline-title">
        <header>
          <h2 id="stock-timeline-title">거래와 판단 근거의 흐름</h2>
          <span>{{ groupedTrades.length }}일 · {{ filteredTrades.length }}건</span>
        </header>

        <div v-if="groupedTrades.length" class="stock-journal-page__timeline-list">
          <JournalStockTradeGroup
            v-for="group in groupedTrades"
            :key="group.dateKey"
            :date-key="group.dateKey"
            :trades="group.trades"
          />
        </div>

        <div v-else class="stock-journal-page__filter-empty">
          <AppIcon name="book-open" :size="22" />
          <p>선택한 조건에 해당하는 거래 기록이 없어요.</p>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.stock-journal-page {
  min-height: 100%;
  color: var(--text-primary, #181817);
  background: #ffffff;
}

.stock-journal-page__app-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  height: 60px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  padding: 0 16px;
  background: #ffffff;
}

.stock-journal-page__app-bar button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 12px;
  color: var(--text-primary, #181817);
  background: transparent;
  cursor: pointer;
}

.stock-journal-page__app-bar button:hover {
  background: #f7f8fa;
}

.stock-journal-page__app-bar button:focus-visible,
.stock-journal-page__filters button:focus-visible,
.stock-journal-page__state button:focus-visible {
  outline: 2px solid var(--brand-teal-deep, #087f7c);
  outline-offset: 2px;
}

.stock-journal-page__app-bar h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.stock-journal-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 20px 24px;
}

.stock-journal-page__stock-header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.stock-journal-page__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.stock-journal-page__identity > div {
  min-width: 0;
}

.stock-journal-page__identity h2 {
  overflow: hidden;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 19px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-journal-page__identity p {
  margin: 2px 0 0;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 11px;
}

.stock-journal-page__stock-header > span {
  flex: 0 0 auto;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.stock-journal-page__holding {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid #bfe4e2;
  border-radius: 12px;
  background: var(--brand-mist, #f5fbfb);
}

.stock-journal-page__holding-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.stock-journal-page__holding-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 10px;
  color: var(--brand-teal-deep, #087f7c);
  background: var(--brand-teal-soft, #e8f7f6);
}

.stock-journal-page__holding-main > div,
.stock-journal-page__holding-detail {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.stock-journal-page__holding-main > div {
  gap: 2px;
}

.stock-journal-page__holding-main span,
.stock-journal-page__holding-detail strong {
  color: #66777d;
  font-size: 10px;
  font-weight: 600;
}

.stock-journal-page__holding-main strong {
  color: var(--slate-strong, #263a43);
  font-family: var(--font-heading);
  font-size: 16px;
}

.stock-journal-page__holding-detail {
  flex: 0 0 auto;
  align-items: flex-end;
  gap: 3px;
  text-align: right;
}

.stock-journal-page__holding-detail span {
  color: var(--brand-teal-deep, #087f7c);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
}

.stock-journal-page__filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.stock-journal-page__filters::-webkit-scrollbar {
  display: none;
}

.stock-journal-page__filters button {
  height: 33px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid #dce6e9;
  border-radius: 9999px;
  color: var(--text-secondary, #666662);
  background: #ffffff;
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.stock-journal-page__filters .stock-journal-page__filter--active {
  border-color: var(--teal-deep, #075f5a);
  color: #ffffff;
  background: var(--teal-deep, #075f5a);
}

.stock-journal-page__timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-journal-page__timeline > header {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--border-default, #e5e5e0);
}

.stock-journal-page__timeline h2 {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
}

.stock-journal-page__timeline header span {
  flex: 0 0 auto;
  color: var(--text-tertiary, #94948e);
  font-family: var(--font-mono);
  font-size: 10px;
}

.stock-journal-page__timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-journal-page__filter-empty {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #dce6e9;
  border-radius: 12px;
  color: var(--text-tertiary, #94948e);
  background: #fbfcfc;
  text-align: center;
}

.stock-journal-page__filter-empty p {
  margin: 0;
  font-size: 11px;
}

.stock-journal-page__state {
  display: flex;
  min-height: 620px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 24px;
  color: var(--text-secondary, #666662);
  text-align: center;
}

.stock-journal-page__state h2,
.stock-journal-page__state p {
  margin: 0;
}

.stock-journal-page__state h2 {
  color: var(--text-primary, #181817);
  font-family: var(--font-heading);
  font-size: 17px;
}

.stock-journal-page__state p {
  font-size: 11px;
}

.stock-journal-page__state-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.stock-journal-page__state button {
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: var(--brand-teal-deep, #087f7c);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.stock-journal-page__state .stock-journal-page__state-secondary {
  border: 1px solid #dce6e9;
  color: var(--text-secondary, #666662);
  background: #ffffff;
}
</style>
