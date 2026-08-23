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

    <span class="holding-shortcut__identity">
      <strong>{{ stock.securityName }}</strong>
      <small class="holding-shortcut__quantity">{{ holdingQuantity }}주 보유</small>
    </span>

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
  width: 100%;
  min-height: 72px;
  align-items: center;
  gap: 11px;
  padding: 11px 13px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
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
  transform: translateX(2px);
}

.holding-shortcut:focus-visible {
  outline: 2px solid #087f7c;
  outline-offset: 2px;
}

.holding-shortcut__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.holding-shortcut__identity strong {
  max-width: 100%;
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.holding-shortcut__identity .holding-shortcut__quantity {
  color: #3976d9;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 600;
}

.holding-shortcut--naver .holding-shortcut__quantity {
  color: #23855a;
}

.holding-shortcut--kakao .holding-shortcut__quantity {
  color: #a86a00;
}

.holding-shortcut__return {
  display: flex;
  min-width: 58px;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: auto;
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
