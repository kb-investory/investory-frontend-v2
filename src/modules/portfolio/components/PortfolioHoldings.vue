<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'
import { usePortfolioStore } from '@/modules/portfolio/stores/portfolioStore'
import AppIcon from '@/shared/components/AppIcon.vue'

const router = useRouter()
const portfolioStore = usePortfolioStore()

const holdings = computed(() => portfolioStore.portfolios || [])

function formatQuantity(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}주`
}

function formatProfit(value) {
  const amount = Number(value || 0)
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : ''
  return `${prefix}${Math.abs(amount).toLocaleString('ko-KR')}원`
}

function formatReturn(value) {
  const rate = Number(value || 0)
  const prefix = rate > 0 ? '+' : rate < 0 ? '-' : ''
  return `${prefix}${Math.abs(rate).toFixed(2)}%`
}

function valueClass(value) {
  if (value > 0) return 'is-profit'
  if (value < 0) return 'is-loss'
  return ''
}

function goToJournal() {
  router.push({ name: ROUTE_NAMES.JOURNAL })
}
</script>

<template>
  <section class="holdings" aria-labelledby="holdings-title">
    <header class="holdings__header">
      <h2 id="holdings-title" class="holdings__title">보유 종목</h2>
      <button type="button" class="holdings__all-button" @click="goToJournal">
        <span>전체 {{ holdings.length }}개</span>
        <AppIcon name="chevron-right" :size="14" aria-hidden="true" />
      </button>
    </header>

    <div class="holdings__table-wrap">
      <table class="holdings__table">
        <thead>
          <tr>
            <th scope="col">종목명</th>
            <th scope="col">보유수량</th>
            <th scope="col">평가손익</th>
            <th scope="col">수익률</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="stock in holdings"
            :key="stock.stockId"
            class="holdings__row"
            tabindex="0"
            role="link"
            :aria-label="`${stock.name} 투자 일지로 이동`"
            @click="goToJournal"
            @keydown.enter="goToJournal"
            @keydown.space.prevent="goToJournal"
          >
            <th scope="row" class="holdings__name">{{ stock.name }}</th>
            <td>{{ formatQuantity(stock.holding) }}</td>
            <td :class="valueClass(stock.profitLoss)">{{ formatProfit(stock.profitLoss) }}</td>
            <td :class="valueClass(stock.returnRate)">{{ formatReturn(stock.returnRate) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="holdings.length === 0" class="holdings__empty">보유 중인 종목이 없습니다.</p>
    </div>
  </section>
</template>

<style scoped>
.holdings {
  width: 100%;
  padding: 4px 0 8px;
}

.holdings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.holdings__title {
  margin: 0;
  color: #181817;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.holdings__all-button {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #888880;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.holdings__all-button:hover {
  color: #555554;
}

.holdings__table-wrap {
  overflow: hidden;
  border-top: 1px solid #e8e8e5;
  border-bottom: 1px solid #e8e8e5;
}

.holdings__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.holdings__table th,
.holdings__table td {
  height: 34px;
  padding: 0 8px;
  border-bottom: 1px solid #f0f0ed;
  color: #555554;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  text-align: right;
  white-space: nowrap;
}

.holdings__table thead th {
  height: 29px;
  background: #f6f6f4;
  color: #999998;
  font-size: 10px;
  font-weight: 600;
}

.holdings__table th:first-child,
.holdings__table td:first-child {
  width: 34%;
  padding-left: 10px;
  text-align: left;
}

.holdings__table th:nth-child(2),
.holdings__table td:nth-child(2) {
  width: 19%;
}

.holdings__table th:nth-child(3),
.holdings__table td:nth-child(3) {
  width: 26%;
}

.holdings__table th:last-child,
.holdings__table td:last-child {
  width: 21%;
  padding-right: 10px;
}

.holdings__table tbody tr:last-child > * {
  border-bottom: 0;
}

.holdings__row {
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease;
}

.holdings__row:hover,
.holdings__row:focus-visible {
  background: #fffdee;
}

.holdings__row:focus-visible {
  outline: 2px solid #facc15;
  outline-offset: -2px;
}

.holdings__name {
  color: #333330 !important;
  font-weight: 700 !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-profit {
  color: #dc2626 !important;
  font-weight: 700 !important;
}

.is-loss {
  color: #2563eb !important;
  font-weight: 700 !important;
}

.holdings__empty {
  margin: 0;
  padding: 28px 0;
  color: #888880;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 420px) {
  .holdings__table th,
  .holdings__table td {
    height: 31px;
    padding: 0 5px;
    font-size: 10px;
  }

  .holdings__table thead th {
    height: 27px;
    font-size: 9px;
  }

  .holdings__table th:first-child,
  .holdings__table td:first-child {
    padding-left: 6px;
  }

  .holdings__table th:last-child,
  .holdings__table td:last-child {
    padding-right: 6px;
  }
}
</style>
