<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import StatusBadge from '@/shared/components/badges/StatusBadge.vue'

const props = defineProps({
  participants: {
    type: Array,
    default: () => [
      { variantId: 1, variantName: '실제 나', variantType: 'ACTUAL_USER', totalEquity: 5250000, cumulativeReturnPercent: 5.0 },
      { variantId: 2, variantName: '나의 투자봇 v1', variantType: 'PERSONAL_BOT', totalEquity: 5850000, cumulativeReturnPercent: 17.0 },
      { variantId: 3, variantName: '우량 가치·품질 퀀트 봇', variantType: 'FAMOUS_STRATEGY', totalEquity: 5400000, cumulativeReturnPercent: 8.0 },
      { variantId: 4, variantName: '원숭이 봇', variantType: 'RANDOM_BOT', totalEquity: 4900000, cumulativeReturnPercent: -2.0 },
    ],
  },
  simulatedTrades: {
    type: Array,
    default: () => [
      { simulatedTradeId: 1001, tradeSide: 'BUY', tradedAt: '2026-03-05', unitPrice: 70000, quantity: 10, decisionReason: '[AI 팩터 통과] 팩터 점수 78.5점으로 최소 기준 초과 및 상승 추세 감지' },
      { simulatedTradeId: 1002, tradeSide: 'SELL', tradedAt: '2026-04-12', unitPrice: 82000, quantity: 5, decisionReason: '[원칙 익절 실행] 목표 수익률 +15% 달성에 따른 50% 분할 익절 매도' },
    ],
  },
})

const emit = defineEmits(['complete'])

const progress = ref(0)
const speed = ref(1)
const isPlaying = ref(true)
let timer = null

function startSimulation() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (!isPlaying.value) return
    progress.value += speed.value * 2.5
    if (progress.value >= 100) {
      progress.value = 100
      isPlaying.value = false
      clearInterval(timer)
      setTimeout(() => emit('complete'), 800)
    }
  }, 100)
}

function setSpeed(s) {
  speed.value = s
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
}

onMounted(() => {
  startSimulation()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function formatCurrency(val) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
}

function formatPercent(val) {
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(1)}%`
}
</script>

<template>
  <div class="live-runner-container">
    <!-- Top Header -->
    <div class="live-header">
      <div class="live-header__left">
        <h2 class="live-title">라이브 시뮬레이션</h2>
        <StatusBadge :variant="progress < 100 ? 'success' : 'neutral'">
          <span class="live-dot" :class="{ pulsing: isPlaying }"></span>
          {{ progress < 100 ? '백테스트 연산 중' : '연산 완료' }}
        </StatusBadge>
      </div>

      <!-- Playback Speed Controls -->
      <div class="speed-controls">
        <button
          v-for="s in [1, 2, 5]"
          :key="s"
          class="speed-btn"
          :class="{ active: speed === s }"
          @click="setSpeed(s)"
        >
          {{ s }}×
        </button>
        <button class="play-btn" @click="togglePlay">
          <AppIcon :name="isPlaying ? 'pause' : 'play'" :size="14" />
        </button>
      </div>
    </div>

    <!-- Live Progress Bar -->
    <div class="progress-section">
      <div class="progress-info">
        <span class="progress-date">2026.03.01</span>
        <span class="progress-percent">{{ Math.round(progress) }}% 진행</span>
        <span class="progress-date">2026.07.29</span>
      </div>

      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Live Participant Rankings -->
    <div class="rankings-box">
      <h3 class="rankings-title">실시간 성과 순위</h3>

      <div class="rankings-list">
        <div
          v-for="(bot, index) in participants"
          :key="bot.variantId"
          class="rank-card"
          :class="{ 'rank-card--top': bot.variantType === 'PERSONAL_BOT' }"
        >
          <div class="rank-badge">{{ index + 1 }}위</div>

          <div class="rank-info">
            <span class="rank-name">{{ bot.variantName }}</span>
            <span class="rank-equity">{{ formatCurrency(bot.totalEquity) }}</span>
          </div>

          <span
            class="rank-return"
            :class="{ positive: bot.cumulativeReturnPercent > 0, negative: bot.cumulativeReturnPercent < 0 }"
          >
            {{ formatPercent(bot.cumulativeReturnPercent) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Live Trade Executions Feed (Screen 1F) -->
    <div class="trades-feed">
      <h3 class="trades-feed__title">실시간 체결 & 판단 사유</h3>

      <div class="trades-list">
        <div v-for="trade in simulatedTrades" :key="trade.simulatedTradeId" class="trade-item">
          <div class="trade-item__top">
            <span class="trade-side" :class="trade.tradeSide.toLowerCase()">
              {{ trade.tradeSide === 'BUY' ? '매수 체결' : '매도 체결' }}
            </span>
            <span class="trade-time">{{ trade.tradedAt }}</span>
          </div>

          <p class="trade-reason">{{ trade.decisionReason }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-runner-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.live-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.live-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #263a43;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0b8f8b;
  display: inline-block;
  margin-right: 4px;
}

.live-dot.pulsing {
  animation: pulse 1.2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f7f8fa;
  padding: 4px;
  border-radius: 12px;
}

.speed-btn {
  border: none;
  background: none;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #66777d;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.speed-btn.active {
  background: #263a43;
  color: #ffffff;
}

.play-btn {
  border: none;
  background: #263a43;
  color: #ffffff;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: #263a43;
  border-radius: 14px;
  color: #ffffff;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #dce6e9;
}

.progress-percent {
  color: #0b8f8b;
  font-weight: 700;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0b8f8b 0%, #3b82f6 100%);
  border-radius: 4px;
  transition: width 0.1s linear;
}

.rankings-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 16px;
}

.rankings-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #263a43;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.rank-card--top {
  background: #f5fbfb;
  border: 1px solid #0b8f8b;
}

.rank-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #263a43;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 6px;
}

.rank-card--top .rank-badge {
  background: #0b8f8b;
  color: #ffffff;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rank-name {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.rank-equity {
  font-size: 11px;
  color: #64748b;
}

.rank-return {
  font-size: 13px;
  font-weight: 700;
}

.rank-return.positive { color: #dc2626; }
.rank-return.negative { color: #2563eb; }

.trades-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 16px;
}

.trades-feed__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #263a43;
}

.trades-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trade-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 10px;
}

.trade-item__top {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.trade-side {
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.trade-side.buy {
  background: #fee2e2;
  color: #dc2626;
}

.trade-side.sell {
  background: #dbeafe;
  color: #2563eb;
}

.trade-time {
  color: #94a3b8;
}

.trade-reason {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #475569;
}
</style>
