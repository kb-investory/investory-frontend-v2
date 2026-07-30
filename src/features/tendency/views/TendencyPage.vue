<script setup>
import { onMounted, ref } from 'vue'

import { useTendencyStore } from '@/features/tendency/stores/tendencyStore'
import StatusBadge from '@/shared/components/badges/StatusBadge.vue'
import TendencyCard from '@/shared/components/cards/TendencyCard.vue'
import BaseLoading from '@/shared/components/feedback/BaseLoading.vue'
import InfoBanner from '@/shared/components/feedback/InfoBanner.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'
import SegmentedControl from '@/shared/components/navigation/SegmentedControl.vue'

const tendencyStore = useTendencyStore()
const activeTab = ref('투자성향')

onMounted(() => tendencyStore.fetchTendencies())
</script>

<template>
  <div class="mobile-page">
    <AppBar title="투자 성향" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <SegmentedControl v-model="activeTab" :options="['투자성향', '투자원칙']" />

      <InfoBanner
        title="분석 결과가 업데이트됐어요"
        description="새로운 기록을 바탕으로 성향을 다시 분석했습니다."
      />

      <StatusBadge status-text="분석 완료" step-text="2 / 6" />

      <div v-if="tendencyStore.loading" class="loading-wrapper">
        <BaseLoading />
      </div>

      <div v-else class="tendency-list">
        <TendencyCard
          title="추천에 반영된 나의 성향"
          description="8가지 성향을 모두 확인할 수 있어요"
          count-text="8개"
        />

        <TendencyCard
          v-if="tendencyStore.analysis"
          :title="tendencyStore.analysis.summary?.combinationSummary || '안정성장형 투자자'"
          :description="tendencyStore.analysis.summary?.strengthSummary || '원칙 준수율 88%'"
          count-text="분석"
        />
      </div>
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

.tendency-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-wrapper {
  padding: 40px 0;
}
</style>
