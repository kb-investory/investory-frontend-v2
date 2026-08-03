<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalStockLogo from '@/features/journal/components/JournalStockLogo.vue'
import { useJournalStockSearchStore } from '@/features/journal/stores/journalStockSearchStore'
import AppIcon from '@/shared/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const stockSearchStore = useJournalStockSearchStore()

const securityCode = computed(() => String(route.params.securityCode ?? ''))
const stock = computed(() => stockSearchStore.findStock(securityCode.value))

const formattedRecentDate = computed(() => {
  if (!stock.value?.recentJournalDate) {
    return '-'
  }

  const [year, month, day] = stock.value.recentJournalDate.split('-').map(Number)
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
})

onMounted(async () => {
  if (!stockSearchStore.stocks.length) {
    await stockSearchStore.initialize()
  }
})

function goToSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL_SEARCH })
}
</script>

<template>
  <section class="stock-journal-page">
    <header class="stock-journal-page__app-bar">
      <button type="button" aria-label="종목 검색으로 돌아가기" @click="goToSearch">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <h1>종목 거래 일지</h1>
      <button type="button" aria-label="다른 종목 검색" @click="goToSearch">
        <AppIcon name="search" :size="19" />
      </button>
    </header>

    <main v-if="stock" class="stock-journal-page__content">
      <section class="stock-journal-page__profile">
        <JournalStockLogo :stock="stock" :size="64" />
        <div>
          <span>STOCK JOURNEY</span>
          <h2>{{ stock.securityName }}</h2>
          <p>{{ stock.securityCode }}</p>
        </div>
      </section>

      <p class="stock-journal-page__message">
        이 종목과 함께 기록한 거래와 투자 판단의 흐름을 확인하세요.
      </p>

      <section class="stock-journal-page__summary" aria-label="종목 일지 요약">
        <div>
          <span>작성 일지</span>
          <strong>{{ stock.journalDays }}일</strong>
        </div>
        <div>
          <span>매수 기록</span>
          <strong>{{ stock.buyCount }}회</strong>
        </div>
        <div>
          <span>매도 기록</span>
          <strong>{{ stock.sellCount }}회</strong>
        </div>
      </section>

      <section class="stock-journal-page__recent">
        <span>가장 최근 기록</span>
        <strong>{{ formattedRecentDate }}</strong>
        <p>최근 거래와 판단 근거를 기준으로 투자 여정을 이어서 확인할 수 있어요.</p>
      </section>

      <button class="stock-journal-page__search-again" type="button" @click="goToSearch">
        <AppIcon name="search" :size="17" />
        다른 종목 검색
      </button>
    </main>

    <main v-else class="stock-journal-page__empty">
      <AppIcon name="search" :size="24" />
      <h2>종목 정보를 찾을 수 없어요</h2>
      <p>{{ securityCode }} 종목코드를 다시 확인해 주세요.</p>
      <button type="button" @click="goToSearch">종목 다시 검색</button>
    </main>
  </section>
</template>

<style scoped>
.stock-journal-page {
  min-height: 100%;
  color: #181817;
  background: #ffffff;
}

.stock-journal-page__app-bar {
  display: grid;
  height: 60px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  padding: 0 16px;
}

.stock-journal-page__app-bar button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 12px;
  color: #181817;
  background: transparent;
  cursor: pointer;
}

.stock-journal-page__app-bar button:hover {
  background: #f7f8fa;
}

.stock-journal-page__app-bar button:focus-visible,
.stock-journal-page__search-again:focus-visible,
.stock-journal-page__empty button:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

.stock-journal-page__app-bar h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 20px;
  text-align: center;
}

.stock-journal-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 24px;
}

.stock-journal-page__profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid #dce6e9;
  border-radius: 18px;
  background: #f7fbfb;
}

.stock-journal-page__profile div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.stock-journal-page__profile span {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.stock-journal-page__profile h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 22px;
}

.stock-journal-page__profile p {
  margin: 0;
  color: #94948e;
  font-family: var(--font-mono);
  font-size: 11px;
}

.stock-journal-page__message {
  margin: 0;
  color: #666662;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 17px;
}

.stock-journal-page__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid #dce6e9;
  border-radius: 16px;
  background: #ffffff;
}

.stock-journal-page__summary div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 16px 6px;
}

.stock-journal-page__summary div + div {
  border-left: 1px solid #e5e5e0;
}

.stock-journal-page__summary span {
  color: #94948e;
  font-size: 10px;
}

.stock-journal-page__summary strong {
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: 16px;
}

.stock-journal-page__recent {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  border-radius: 16px;
  color: #ffffff;
  background: #263a43;
}

.stock-journal-page__recent span {
  color: #7ee2dc;
  font-size: 10px;
  font-weight: 700;
}

.stock-journal-page__recent strong {
  font-family: var(--font-mono);
  font-size: 20px;
}

.stock-journal-page__recent p {
  margin: 0;
  color: #d8e3e6;
  font-size: 10px;
  line-height: 16px;
}

.stock-journal-page__search-again,
.stock-journal-page__empty button {
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  background: #087f7c;
  font-weight: 700;
  cursor: pointer;
}

.stock-journal-page__empty {
  display: flex;
  min-height: 600px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #666662;
  text-align: center;
}

.stock-journal-page__empty h2,
.stock-journal-page__empty p {
  margin: 0;
}

.stock-journal-page__empty h2 {
  color: #181817;
  font-family: var(--font-heading);
  font-size: 18px;
}

.stock-journal-page__empty p {
  font-size: 11px;
}

.stock-journal-page__empty button {
  margin-top: 12px;
}
</style>
