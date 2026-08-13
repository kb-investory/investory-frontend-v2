<script setup>
import { computed } from 'vue'

import StockLogo from '@/shared/components/StockLogo.vue'

const props = defineProps({
  stock: {
    type: Object,
    required: true,
  },
})

defineEmits(['select'])

const holdingQuantity = computed(() => Number(props.stock.holdingQuantity ?? 0))
const returnRate = computed(() => {
  const value = Number(props.stock.returnRate ?? 0)
  return Number.isFinite(value) ? value : 0
})
</script>

<template>
  <button
    class="holding-shortcut"
    :class="`holding-shortcut--${stock.brandKey}`"
    type="button"
    :aria-label="`${stock.securityName}, ${holdingQuantity}주 보유, 종목 거래 일지 보기`"
    @click="$emit('select', stock)"
  >
    <StockLogo :stock="stock" :size="32" />
    <strong>{{ stock.securityName }}</strong>
    <span>{{ holdingQuantity }}주 보유</span>
    <span class="holding-shortcut__return">
      <small>수익률</small>
      <b :class="{ 'holding-shortcut__return--loss': returnRate < 0 }">
        {{ returnRate > 0 ? '+' : '' }}{{ returnRate.toFixed(1) }}%
      </b>
    </span>
  </button>
</template>

<style scoped>
.holding-shortcut {
  display: flex;
  min-width: 104px;
  min-height: 120px;
  flex: 1 0 104px;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  color: #181817;
  background: #eef4ff;
  text-align: left;
  cursor: pointer;
}

.holding-shortcut--naver {
  background: #eff9f1;
}

.holding-shortcut--kakao {
  background: #fff8da;
}

.holding-shortcut:hover {
  transform: translateY(-1px);
}

.holding-shortcut:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

.holding-shortcut strong,
.holding-shortcut > span {
  max-width: 100%;
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holding-shortcut > span {
  color: #3976d9;
  font-weight: 600;
}

.holding-shortcut--naver > span {
  color: #23855a;
}

.holding-shortcut--kakao > span {
  color: #a86a00;
}

.holding-shortcut__return {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.holding-shortcut__return small {
  color: #666662;
  font-size: var(--font-size-caption);
}

.holding-shortcut__return b {
  color: #e34b4b;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.holding-shortcut__return b.holding-shortcut__return--loss {
  color: #3976d9;
}
</style>
