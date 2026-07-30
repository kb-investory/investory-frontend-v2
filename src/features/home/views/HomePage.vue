<script setup>
import { onMounted } from 'vue'

import { useHomeStore } from '@/features/home/stores/homeStore'
import BaseCard from '@/shared/components/cards/BaseCard.vue'
import MetricStrip from '@/shared/components/cards/MetricStrip.vue'
import QuoteCard from '@/shared/components/cards/QuoteCard.vue'
import StockCard from '@/shared/components/cards/StockCard.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const homeStore = useHomeStore()

onMounted(() => homeStore.fetchSummary())
</script>

<template>
  <div class="mobile-page">
    <AppBar title="Investory" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <QuoteCard
        badge="오늘의 기록"
        title="판단을 남기면 다음 선택의 근거가 됩니다"
        description="수익률보다 당시의 생각과 원칙을 먼저 확인하세요."
      />

      <BaseCard
        v-if="homeStore.summary"
        :title="homeStore.summary.title"
        :description="homeStore.summary.description"
      >
        <MetricStrip
          :metrics="[
            {
              label: '총 자산',
              value: `${(homeStore.summary.totalMarketValue || 0).toLocaleString()}원`,
            },
            {
              label: '평가 손익',
              value: `+${(homeStore.summary.totalUnrealizedPnl || 0).toLocaleString()}원`,
              tone: 'danger',
            },
          ]"
        />
      </BaseCard>
      <BaseLoading v-else />

      <section class="holdings-section">
        <h3 class="section-title">보유 종목</h3>
        <div class="holdings-list">
          <StockCard
            v-for="holding in homeStore.holdings"
            :key="holding.securityId"
            symbol="S"
            :name="holding.securityName"
            :quantity="`${holding.quantity}주`"
            :avg-price="`${holding.avgCost.toLocaleString()}원`"
            :valuation="`${holding.valuationAmount.toLocaleString()}원`"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 8px 0 12px 0;
  color: #18272d;
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
}

.holdings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
