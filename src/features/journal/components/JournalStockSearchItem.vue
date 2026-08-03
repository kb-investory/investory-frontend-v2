<script setup>
import JournalStockLogo from '@/features/journal/components/JournalStockLogo.vue'
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  stock: {
    type: Object,
    required: true,
  },
})

defineEmits(['select'])

function formatRecentDate(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number)
  return `${month}월 ${day}일`
}
</script>

<template>
  <button
    class="stock-search-item"
    type="button"
    :aria-label="`${stock.securityName} 종목 거래 일지 보기`"
    @click="$emit('select', stock)"
  >
    <JournalStockLogo :stock="stock" />

    <span class="stock-search-item__content">
      <span class="stock-search-item__identity">
        <strong>{{ stock.securityName }}</strong>
        <span>{{ stock.securityCode }}</span>
      </span>
      <span class="stock-search-item__stats">
        {{ stock.journalDays }}일의 일지 · 매수 {{ stock.buyCount }} · 매도
        {{ stock.sellCount }}
      </span>
      <span class="stock-search-item__recent">
        최근 기록 {{ formatRecentDate(stock.recentJournalDate) }}
      </span>
    </span>

    <AppIcon name="chevron-right" :size="16" />
  </button>
</template>

<style scoped>
.stock-search-item {
  display: flex;
  width: 100%;
  min-height: 102px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
  color: #181817;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  text-align: left;
  cursor: pointer;
}

.stock-search-item:hover {
  border-color: #bfe4e2;
  background: #fbfefe;
}

.stock-search-item:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

.stock-search-item__content {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
  gap: 4px;
}

.stock-search-item__identity {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stock-search-item__identity strong {
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-search-item__identity span,
.stock-search-item__stats,
.stock-search-item__recent {
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 15px;
}

.stock-search-item__identity span,
.stock-search-item__recent {
  color: #94948e;
}

.stock-search-item__stats {
  color: #666662;
}

.stock-search-item > :last-child {
  color: #94948e;
}
</style>
