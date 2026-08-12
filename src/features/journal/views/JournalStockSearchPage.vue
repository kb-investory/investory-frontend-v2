<script setup>
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import JournalHoldingShortcut from '@/features/journal/components/JournalHoldingShortcut.vue'
import JournalStockSearchItem from '@/features/journal/components/JournalStockSearchItem.vue'
import { useJournalStockSearchStore } from '@/features/journal/stores/journalStockSearchStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'

const SEARCH_DELAY_MS = 300

const route = useRoute()
const router = useRouter()
const stockSearchStore = useJournalStockSearchStore()
const { recentStocks, heldStocks, searchResults, isLoading, error } = storeToRefs(stockSearchStore)

const query = ref(String(route.query.q ?? ''))

onMounted(async () => {
  await stockSearchStore.initialize()
})

watch(
  query,
  (keyword, _, onCleanup) => {
    const timer = window.setTimeout(() => {
      stockSearchStore.search(keyword)
    }, SEARCH_DELAY_MS)

    onCleanup(() => window.clearTimeout(timer))
  },
  { immediate: true },
)

function closeSearch() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}

function applyRecentSearch(stock) {
  query.value = stock.securityName
}

async function openStockJournal(stock) {
  await stockSearchStore.rememberStock(stock.securityCode)
  await router.push({
    name: ROUTE_NAMES.JOURNAL_STOCK,
    params: { securityCode: stock.securityCode },
  })
}
</script>

<template>
  <section class="stock-search-page">
    <header class="stock-search-page__app-bar">
      <button type="button" aria-label="투자 일지로 돌아가기" @click="closeSearch">
        <AppIcon name="chevron-left" :size="20" />
      </button>
      <h1>종목별 일지 검색</h1>
      <span aria-hidden="true" />
    </header>

    <main class="stock-search-page__content">
      <SearchInput
        v-model="query"
        placeholder="종목명 또는 종목코드 검색"
        aria-label="종목명 또는 종목코드 검색"
        autofocus
      />

      <p class="stock-search-page__description">
        종목을 선택하면 거래와 판단 근거가 쌓인 여정을 볼 수 있어요.
      </p>

      <section v-if="recentStocks.length" class="stock-search-page__section">
        <h2>최근 검색</h2>
        <div class="stock-search-page__recent-list">
          <button
            v-for="stock in recentStocks"
            :key="stock.securityCode"
            type="button"
            @click="applyRecentSearch(stock)"
          >
            {{ stock.securityName }}
          </button>
        </div>
      </section>

      <section v-if="query.trim()" class="stock-search-page__results" aria-live="polite">
        <header>
          <h2>검색 결과</h2>
          <span v-if="!isLoading && !error">{{ searchResults.length }}개 종목</span>
        </header>

        <div v-if="isLoading" class="stock-search-page__state" aria-label="검색 중">
          <BaseLoading />
          <p>종목을 찾고 있어요.</p>
        </div>

        <div v-else-if="error" class="stock-search-page__state" role="alert">
          <AppIcon name="triangle-alert" :size="22" />
          <p>검색 결과를 불러오지 못했어요.</p>
          <button type="button" @click="stockSearchStore.search(query)">다시 시도</button>
        </div>

        <div v-else-if="searchResults.length" class="stock-search-page__result-list">
          <JournalStockSearchItem
            v-for="stock in searchResults"
            :key="stock.securityCode"
            :stock="stock"
            @select="openStockJournal"
          />
        </div>

        <div v-else class="stock-search-page__state stock-search-page__state--empty">
          <AppIcon name="search" :size="24" />
          <strong>일치하는 종목이 없어요</strong>
          <p>종목명이나 6자리 종목코드를 다시 확인해 주세요.</p>
        </div>
      </section>

      <section v-if="heldStocks.length" class="stock-search-page__section">
        <header class="stock-search-page__holding-header">
          <h2>내가 보유한 종목</h2>
          <span>연결 계좌 기준</span>
        </header>

        <div class="stock-search-page__holding-list">
          <JournalHoldingShortcut
            v-for="stock in heldStocks"
            :key="stock.securityCode"
            :stock="stock"
            @select="openStockJournal"
          />
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.stock-search-page {
  min-height: 100%;
  color: #181817;
  background: #ffffff;
}

.stock-search-page__app-bar {
  display: grid;
  height: 60px;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  padding: 0 16px;
}

.stock-search-page__app-bar button {
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

.stock-search-page__app-bar button:hover {
  background: #f7f8fa;
}

.stock-search-page__app-bar button:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 1px;
}

.stock-search-page__app-bar h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 700;
  text-align: center;
}

.stock-search-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 10px 20px 24px;
}

.stock-search-page__description {
  margin: 0;
  color: #666662;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  line-height: 1.4;
}

.stock-search-page__section,
.stock-search-page__results {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stock-search-page__section h2,
.stock-search-page__results h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.stock-search-page__recent-list {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  scrollbar-width: none;
}

.stock-search-page__recent-list::-webkit-scrollbar {
  display: none;
}

.stock-search-page__recent-list button {
  height: 40px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 9999px;
  color: #666662;
  background: #f7f8fa;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 600;
  cursor: pointer;
}

.stock-search-page__recent-list button:hover,
.stock-search-page__recent-list button:focus-visible {
  border-color: #87ccc8;
  color: #087f7c;
  background: #eef9f8;
}

.stock-search-page__results > header,
.stock-search-page__holding-header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e5e0;
}

.stock-search-page__results > header span,
.stock-search-page__holding-header span {
  color: #94948e;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
}

.stock-search-page__result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-search-page__state {
  display: flex;
  min-height: 130px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 1px dashed #dce6e9;
  border-radius: 16px;
  color: #666662;
  background: #fbfcfc;
  text-align: center;
}

.stock-search-page__state strong,
.stock-search-page__state p {
  margin: 0;
  font-size: var(--font-size-caption);
}

.stock-search-page__state button {
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  color: #ffffff;
  background: #087f7c;
  cursor: pointer;
}

.stock-search-page__state--empty {
  color: #94948e;
}

.stock-search-page__holding-list {
  display: flex;
  gap: 8px;
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.stock-search-page__holding-list::-webkit-scrollbar {
  display: none;
}
</style>
