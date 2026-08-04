<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const props = defineProps({
  latestResult: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['restart'])
const router = useRouter()

const rankedParticipants = computed(() =>
  [...(props.latestResult?.participantSummary ?? [])].sort(
    (a, b) => b.cumulativeReturnPercent - a.cumulativeReturnPercent,
  ),
)
const winner = computed(() => rankedParticipants.value[0] ?? null)
const resultPeriod = computed(() => {
  const run = props.latestResult?.simulationRun
  return run ? `${run.periodStart} — ${run.periodEnd}` : ''
})

function goToPrinciplesEdit() {
  router.push('/tendency/principles/edit')
}

function formatCurrency(val) {
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
  <div class="result-summary-container">
    <!-- Top Status Header -->
    <div class="result-header">
      <span class="race-complete-badge">RACE COMPLETE</span>
      <span class="period-text">{{ resultPeriod }}</span>
    </div>

    <!-- Winner Hero Card (Screen 1G) -->
    <div class="winner-hero">
      <div class="winner-hero__icon-box">
        <AppIcon name="sparkles" :size="24" />
      </div>

      <div class="winner-hero__content">
        <h2 class="winner-title">{{ winner?.variantName ?? '시뮬레이션' }}이 1위예요</h2>
        <p class="winner-sub">
          최종 자산 <strong>{{ formatCurrency(winner?.totalEquity ?? 0) }}</strong>
          {{ formatPercent(winner?.cumulativeReturnPercent) }}
        </p>
      </div>
    </div>

    <!-- Rankings Table Card -->
    <div class="rankings-section">
      <h3 class="section-title">참가자 최종 성과 순위</h3>

      <div v-if="latestResult" class="rankings-list">
        <div
          v-for="(bot, index) in rankedParticipants"
          :key="bot.variantId"
          class="bot-rank-card"
          :class="{ 'bot-rank-card--first': index === 0 }"
        >
          <div class="bot-rank-card__left">
            <span class="rank-num" :class="{ 'rank-num--first': index === 0 }">{{
              index + 1
            }}</span>
            <div class="bot-info">
              <div class="name-row">
                <span class="bot-name">{{ bot.variantName }}</span>
                <span class="type-tag">{{ getVariantBadge(bot.variantType).text }}</span>
              </div>
              <span class="equity-text">최종 {{ formatCurrency(bot.totalEquity) }}</span>
            </div>
          </div>

          <div class="bot-rank-card__right">
            <span
              class="return-value"
              :class="{
                positive: bot.cumulativeReturnPercent > 0,
                negative: bot.cumulativeReturnPercent < 0,
              }"
            >
              {{ formatPercent(bot.cumulativeReturnPercent) }}
            </span>
            <span class="mdd-text">MDD {{ formatPercent(bot.mddPercent) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulated Trade Log Details -->
    <div v-if="latestResult?.simulatedTrades" class="trade-log-section">
      <h3 class="section-title">주요 체결 일지 & AI 판단 이유</h3>

      <div class="log-list">
        <div
          v-for="trade in latestResult.simulatedTrades"
          :key="trade.simulatedTradeId"
          class="log-card"
        >
          <div class="log-card__header">
            <span class="trade-badge" :class="trade.tradeSide.toLowerCase()">
              {{ trade.tradeSide === 'BUY' ? '매수' : '매도' }}
            </span>
            <span class="trade-date">{{ trade.tradedAt }}</span>
          </div>

          <p class="log-reason">{{ trade.decisionReason }}</p>
        </div>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="action-buttons">
      <BaseButton variant="primary" full-width @click="emit('restart')">
        <AppIcon name="rotate-ccw" :size="18" />
        <span>다시 시뮬레이션하기</span>
      </BaseButton>

      <BaseButton variant="secondary" full-width @click="goToPrinciplesEdit">
        <AppIcon name="pencil" :size="18" />
        <span>투자 원칙 수정하러 가기</span>
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.result-summary-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.race-complete-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #087f7c;
  background: #e8f7f6;
  padding: 4px 10px;
  border-radius: 8px;
  letter-spacing: 0.5px;
}

.period-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #64748b;
}

.winner-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: #263a43;
  border-radius: 18px;
  color: #ffffff;
}

.winner-hero__icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #0b8f8b;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.winner-hero__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.winner-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.winner-sub {
  margin: 0;
  font-size: 13px;
  color: #dce6e9;
}

.winner-sub strong {
  color: #ffffff;
}

.rankings-section,
.trade-log-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 16px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #263a43;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bot-rank-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.bot-rank-card--first {
  background: #f5fbfb;
  border: 1.5px solid #0b8f8b;
}

.bot-rank-card__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rank-num {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-num--first {
  background: #0b8f8b;
  color: #ffffff;
}

.bot-info {
  display: flex;
  flex-direction: column;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bot-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.type-tag {
  font-size: 9px;
  color: #64748b;
  background: #e2e8f0;
  padding: 1px 5px;
  border-radius: 4px;
}

.equity-text {
  font-size: 10px;
  color: #64748b;
}

.bot-rank-card__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.return-value {
  font-size: 13px;
  font-weight: 700;
}

.return-value.positive {
  color: var(--brand-red);
}
.return-value.negative {
  color: var(--brand-blue);
}

.mdd-text {
  font-size: 10px;
  color: #94a3b8;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 10px;
}

.log-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trade-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.trade-badge.buy {
  background: var(--brand-red-soft);
  color: var(--brand-red);
}

.trade-badge.sell {
  background: var(--brand-blue-soft);
  color: var(--brand-blue);
}

.trade-date {
  font-size: 10px;
  color: #94a3b8;
}

.log-reason {
  margin: 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.4;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
