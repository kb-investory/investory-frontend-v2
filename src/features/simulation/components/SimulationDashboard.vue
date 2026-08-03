<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'
import StatusBadge from '@/shared/components/badges/StatusBadge.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseCard from '@/shared/components/cards/BaseCard.vue'

defineProps({
  overview: {
    type: Object,
    required: true,
  },
  latestResult: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['startSimulation'])

function formatCurrency(val) {
  if (!val && val !== 0) return '0원'
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
}

function formatPercent(val) {
  if (!val && val !== 0) return '0.0%'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(1)}%`
}

function getVariantBadge(type) {
  switch (type) {
    case 'ACTUAL_USER':
      return { variant: 'info', text: '실제 계좌' }
    case 'PERSONAL_BOT':
      return { variant: 'success', text: 'AI 투자봇' }
    case 'FAMOUS_STRATEGY':
      return { variant: 'neutral', text: '퀀트 전략' }
    case 'RANDOM_BOT':
      return { variant: 'warning', text: '무작위' }
    default:
      return { variant: 'neutral', text: '대조군' }
  }
}
</script>

<template>
  <div class="simulation-dashboard">
    <!-- Overview Section (xCJcT) -->
    <BaseCard class="overview-card">
      <div class="overview-card__header">
        <div class="title-group">
          <StatusBadge variant="success">
            <AppIcon name="circle-check" :size="12" />
            시뮬레이션 가동 준비 완료
          </StatusBadge>
          <h2 class="overview-card__title">투자 백테스트 개요</h2>
        </div>
        <span class="screen-id-tag">xCJcT</span>
      </div>

      <div class="overview-card__grid">
        <div class="grid-item">
          <span class="grid-item__label">적격 데이터 기간</span>
          <span class="grid-item__value">
            {{ overview.eligiblePeriod?.startDate }} ~ {{ overview.eligiblePeriod?.endDate }}
          </span>
          <span class="grid-item__sub">총 {{ overview.eligiblePeriod?.totalDays }}일간의 거래 데이터</span>
        </div>

        <div class="grid-item">
          <span class="grid-item__label">추천 시작 자본금</span>
          <span class="grid-item__value primary-text">
            {{ formatCurrency(overview.recommendedInitialCapital) }}
          </span>
          <span class="grid-item__sub">연동 계좌: {{ overview.connectedAccountsCount }}개</span>
        </div>
      </div>

      <div class="overview-card__actions">
        <BaseButton variant="primary" block @click="emit('startSimulation')">
          <AppIcon name="play" :size="16" />
          4개 대조군 백테스트 실행하기
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Latest Completion Record Section (GET /api/v1/simulations/latest) -->
    <BaseCard v-if="latestResult" class="record-card">
      <div class="record-card__header">
        <div>
          <h3 class="record-card__title">최근 완료된 시뮬레이션 성과</h3>
          <p class="record-card__subtitle">
            세션 ID #{{ latestResult.simulationRun?.simulationRunId }} ({{
              latestResult.simulationRun?.periodStart
            }}
            ~ {{ latestResult.simulationRun?.periodEnd }})
          </p>
        </div>
        <StatusBadge variant="neutral">
          <AppIcon name="history" :size="12" />
          완료 기록
        </StatusBadge>
      </div>

      <div class="record-card__bots">
        <div
          v-for="bot in latestResult.participantSummary"
          :key="bot.variantId"
          class="bot-card"
          :class="{ 'bot-card--highlight': bot.variantType === 'PERSONAL_BOT' }"
        >
          <div class="bot-card__top">
            <StatusBadge :variant="getVariantBadge(bot.variantType).variant">
              {{ getVariantBadge(bot.variantType).text }}
            </StatusBadge>
            <span class="bot-name">{{ bot.variantName }}</span>
          </div>

          <div class="bot-card__metrics">
            <div class="metric-row">
              <span class="metric-label">누적 수익률</span>
              <span
                class="metric-value"
                :class="{
                  'text-positive': bot.cumulativeReturnPercent > 0,
                  'text-negative': bot.cumulativeReturnPercent < 0,
                }"
              >
                {{ formatPercent(bot.cumulativeReturnPercent) }}
              </span>
            </div>

            <div class="metric-row">
              <span class="metric-label">최종 평가 자산</span>
              <span class="metric-value font-medium">{{ formatCurrency(bot.totalEquity) }}</span>
            </div>

            <div class="metric-row">
              <span class="metric-label">최대 낙폭 (MDD)</span>
              <span class="metric-value text-muted">{{ formatPercent(bot.mddPercent) }}</span>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.simulation-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card,
.record-card {
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-card__header,
.record-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overview-card__title,
.record-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.record-card__subtitle {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.screen-id-tag {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.overview-card__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: #f8fafc;
  padding: 14px;
  border-radius: 12px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grid-item__label {
  font-size: 11px;
  color: #64748b;
}

.grid-item__value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.primary-text {
  color: #2563eb;
}

.grid-item__sub {
  font-size: 11px;
  color: #94a3b8;
}

.record-card__bots {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.bot-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
}

.bot-card--highlight {
  border-color: #3b82f6;
  background: #eff6ff;
}

.bot-card__top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bot-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.bot-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.metric-label {
  color: #64748b;
}

.metric-value {
  font-weight: 700;
}

.text-positive {
  color: #dc2626;
}

.text-negative {
  color: #2563eb;
}

.text-muted {
  color: #64748b;
}

.font-medium {
  font-weight: 600;
}
</style>
