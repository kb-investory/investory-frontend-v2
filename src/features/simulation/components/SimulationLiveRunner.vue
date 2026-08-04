<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import SimulationLiveReturnChart from '@/features/simulation/components/SimulationLiveReturnChart.vue'
import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'

const props = defineProps({
  participants: {
    type: Array,
    default: () => [
      {
        variantId: 1,
        variantName: '실제 나',
        variantType: 'ACTUAL_USER',
        totalEquity: 5250000,
        cumulativeReturnPercent: 5.0,
      },
      {
        variantId: 2,
        variantName: '나의 투자봇 v1',
        variantType: 'PERSONAL_BOT',
        totalEquity: 5850000,
        cumulativeReturnPercent: 17.0,
      },
      {
        variantId: 3,
        variantName: '우량 가치·품질 퀀트 봇',
        variantType: 'FAMOUS_STRATEGY',
        totalEquity: 5400000,
        cumulativeReturnPercent: 8.0,
      },
      {
        variantId: 4,
        variantName: '원숭이 봇',
        variantType: 'RANDOM_BOT',
        totalEquity: 4900000,
        cumulativeReturnPercent: -2.0,
      },
    ],
  },
  simulatedTrades: {
    type: Array,
    default: () => [
      {
        simulatedTradeId: 1001,
        tradeSide: 'BUY',
        tradedAt: '2026-03-05',
        unitPrice: 70000,
        quantity: 10,
        decisionReason: '[AI 팩터 통과] 팩터 점수 78.5점으로 최소 기준 초과 및 상승 추세 감지',
      },
      {
        simulatedTradeId: 1002,
        tradeSide: 'SELL',
        tradedAt: '2026-04-12',
        unitPrice: 82000,
        quantity: 5,
        decisionReason: '[원칙 익절 실행] 목표 수익률 +15% 달성에 따른 50% 분할 익절 매도',
      },
    ],
  },
  dailyPerformance: {
    type: Array,
    default: () => [],
  },
  periodStart: {
    type: String,
    default: '',
  },
  periodEnd: {
    type: String,
    default: '',
  },
  initialCapital: {
    type: Number,
    default: 5000000,
  },
})

const emit = defineEmits(['complete'])

const progress = ref(0)
const speed = ref(1)
const isPlaying = ref(true)
const liveChart = ref(null)
let timer = null
let lastFrameTime = null

const securityNameById = {
  101: 'SK하이닉스',
  202: '삼성전자',
  303: 'NAVER',
  404: '카카오',
  505: '현대차',
  606: '셀트리온',
}

const timelineDates = computed(() =>
  [...new Set(props.dailyPerformance.map((snapshot) => snapshot.snapshotDate))].sort(),
)

const currentSimulationTimestamp = computed(() => {
  if (timelineDates.value.length < 2) return null

  const start = new Date(`${timelineDates.value[0]}T00:00:00`).getTime()
  const end = new Date(`${timelineDates.value.at(-1)}T23:59:59`).getTime()
  return start + (end - start) * (progress.value / 100)
})

const completedTrades = computed(() =>
  props.simulatedTrades
    .filter((trade) => {
      const timestamp = new Date(trade.tradedAt).getTime()
      return (
        Number.isFinite(timestamp) &&
        currentSimulationTimestamp.value &&
        timestamp <= currentSimulationTimestamp.value
      )
    })
    .sort((a, b) => new Date(a.tradedAt).getTime() - new Date(b.tradedAt).getTime()),
)

const latestTrade = computed(() => completedTrades.value.at(-1) ?? null)

const latestTradeParticipant = computed(() =>
  props.participants.find(
    (participant) =>
      String(participant.variantId) === String(latestTrade.value?.simulationVariantId),
  ),
)

const performanceByVariant = computed(() => {
  const grouped = new Map()

  props.dailyPerformance.forEach((snapshot) => {
    const snapshots = grouped.get(snapshot.simulationVariantId) ?? []
    snapshots.push(snapshot)
    grouped.set(snapshot.simulationVariantId, snapshots)
  })

  grouped.forEach((snapshots) =>
    snapshots.sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate)),
  )
  return grouped
})

const liveRankingTimestamp = computed(() => {
  if (timelineDates.value.length < 2) return null

  const start = new Date(`${timelineDates.value[0]}T00:00:00`).getTime()
  const end = new Date(`${timelineDates.value.at(-1)}T00:00:00`).getTime()
  if (progress.value >= 100) return end

  const currentTimestamp = start + (end - start) * (progress.value / 100)
  const completedTradeTimestamps = props.simulatedTrades
    .map((trade) => new Date(trade.tradedAt).getTime())
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp <= currentTimestamp)

  return completedTradeTimestamps.length ? Math.max(...completedTradeTimestamps) : start
})

function getLiveReturn(participant) {
  const snapshots = performanceByVariant.value.get(participant.variantId) ?? []
  const targetTimestamp = liveRankingTimestamp.value
  if (!targetTimestamp) return 0
  if (!snapshots.length) {
    const start = new Date(`${timelineDates.value[0]}T00:00:00`).getTime()
    const end = new Date(`${timelineDates.value.at(-1)}T00:00:00`).getTime()
    const eventProgress = Math.min(Math.max((targetTimestamp - start) / (end - start), 0), 1)
    return participant.cumulativeReturnPercent * eventProgress
  }

  const nextIndex = snapshots.findIndex(
    (snapshot) => new Date(`${snapshot.snapshotDate}T00:00:00`).getTime() > targetTimestamp,
  )
  if (nextIndex === 0) return snapshots[0].cumulativeReturnPercent
  if (nextIndex === -1) return snapshots.at(-1).cumulativeReturnPercent

  const currentSnapshot = snapshots[nextIndex - 1]
  const nextSnapshot = snapshots[nextIndex]
  const currentTimestamp = new Date(`${currentSnapshot.snapshotDate}T00:00:00`).getTime()
  const nextTimestamp = new Date(`${nextSnapshot.snapshotDate}T00:00:00`).getTime()
  const intervalProgress = (targetTimestamp - currentTimestamp) / (nextTimestamp - currentTimestamp)

  return (
    currentSnapshot.cumulativeReturnPercent +
    (nextSnapshot.cumulativeReturnPercent - currentSnapshot.cumulativeReturnPercent) *
      intervalProgress
  )
}

const liveParticipants = computed(() =>
  (props.participants ?? []).map((participant) => {
    const cumulativeReturnPercent = getLiveReturn(participant)
    const initialCapital = participant.totalEquity / (1 + participant.cumulativeReturnPercent / 100)

    return {
      ...participant,
      cumulativeReturnPercent,
      totalEquity: initialCapital * (1 + cumulativeReturnPercent / 100),
      profitLoss: initialCapital * (cumulativeReturnPercent / 100),
    }
  }),
)

const rankedParticipants = computed(() =>
  [...liveParticipants.value].sort((a, b) => b.cumulativeReturnPercent - a.cumulativeReturnPercent),
)

function startSimulation() {
  if (timer) cancelAnimationFrame(timer)
  lastFrameTime = null

  const tick = (timestamp) => {
    if (lastFrameTime === null) lastFrameTime = timestamp
    const elapsedSeconds = (timestamp - lastFrameTime) / 1000
    lastFrameTime = timestamp

    if (isPlaying.value) {
      progress.value += speed.value * 5 * elapsedSeconds
    }

    if (progress.value >= 100) {
      progress.value = 100
      isPlaying.value = false
      timer = null
      return
    }

    timer = requestAnimationFrame(tick)
  }

  timer = requestAnimationFrame(tick)
}

function setSpeed(s) {
  speed.value = s
}

function togglePlay() {
  if (progress.value >= 100) return
  isPlaying.value = !isPlaying.value
}

function goToNextStep() {
  emit('complete')
}

function openLatestTrade() {
  if (!latestTrade.value) return
  liveChart.value?.openTradeView(
    latestTrade.value.simulationVariantId,
    latestTrade.value.simulatedTradeId,
  )
}

onMounted(() => {
  startSimulation()
})

onUnmounted(() => {
  if (timer) cancelAnimationFrame(timer)
})

function formatCurrency(val) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
}

function formatSignedCurrency(val) {
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${formatCurrency(val)}`
}

function formatPercent(val) {
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(1)}%`
}

function formatPeriodDate(date) {
  if (!date) return '-'
  const [year, month, day] = date.split('-')
  return `${year.slice(-2)}.${month}.${day}.`
}
</script>

<template>
  <div class="live-runner-container has-next-step">
    <!-- Top Header -->
    <div class="live-header">
      <!-- Playback Speed Controls -->
      <div class="live-header__controls">
        <span class="speed-controls__label">재생 속도</span>
        <div class="speed-controls">
          <button class="play-btn" :disabled="progress >= 100" @click="togglePlay">
            <AppIcon :name="isPlaying ? 'pause' : 'play'" :size="15" />
          </button>
          <button
            v-for="s in [1, 2, 5, 10]"
            :key="s"
            class="speed-btn"
            :class="{ active: speed === s }"
            @click="setSpeed(s)"
          >
            {{ s }}×
          </button>
        </div>
      </div>
    </div>

    <button
      :key="latestTrade?.simulatedTradeId ?? 'waiting'"
      type="button"
      class="live-trade-alert"
      :class="{ 'is-waiting': !latestTrade }"
      :disabled="!latestTrade"
      @click="openLatestTrade"
    >
      <span class="live-trade-alert__avatar">
        <SimulationParticipantAvatar
          v-if="latestTradeParticipant"
          :variant-type="latestTradeParticipant.variantType"
          :size="40"
        />
        <span v-else class="live-trade-alert__waiting-icon">
          <AppIcon name="activity" :size="17" />
        </span>
      </span>
      <span class="live-trade-alert__content">
        <small v-if="latestTrade">
          <b :class="`is-${latestTrade.tradeSide.toLowerCase()}`">
            {{ latestTrade.tradeSide === 'BUY' ? '매수' : '매도' }}
          </b>
          {{ latestTradeParticipant?.variantName ?? '참가자' }}
        </small>
        <small v-else>거래 신호를 기다리고 있어요</small>
        <strong v-if="latestTrade">
          {{ securityNameById[latestTrade.securityId] ?? `종목 ${latestTrade.securityId}` }}
          {{ latestTrade.quantity }}주
        </strong>
        <strong v-else>매수·매도가 발생하면 바로 알려드릴게요</strong>
        <span v-if="latestTrade">
          주당 {{ formatCurrency(latestTrade.unitPrice) }}
        </span>
        <p v-if="latestTrade" class="live-trade-alert__reason">
          <b>판단 근거</b>
          {{ latestTrade.decisionReason }}
        </p>
      </span>
    </button>

    <SimulationLiveReturnChart
      ref="liveChart"
      :participants="participants"
      :daily-performance="dailyPerformance"
      :simulated-trades="simulatedTrades"
      :initial-capital="initialCapital"
      :progress="progress"
      :speed="speed"
      :total-days="150"
    />

    <section class="simulation-conditions" aria-label="시뮬레이션 조건">
      <div class="simulation-condition">
        <AppIcon name="calendar-range" :size="16" />
        <div>
          <span>시뮬레이션 기간</span>
          <strong>
            {{ formatPeriodDate(periodStart || timelineDates[0]) }} ~
            {{ formatPeriodDate(periodEnd || timelineDates.at(-1)) }}
          </strong>
        </div>
      </div>
      <div class="simulation-condition">
        <AppIcon name="wallet-cards" :size="16" />
        <div>
          <span>초기 자금</span>
          <strong>{{ formatCurrency(initialCapital) }}</strong>
        </div>
      </div>
    </section>

    <!-- Live Participant Rankings -->
    <div class="rankings-box">
      <div class="rankings-box__header">
        <h3 class="rankings-title">현재 순위</h3>
        <span>손익 · 수익률</span>
      </div>

      <div class="rankings-list">
        <div
          v-for="(bot, index) in rankedParticipants"
          :key="bot.variantId"
          class="rank-row"
        >
          <b class="rank-badge" :class="{ 'rank-badge--top': index === 0 }">{{ index + 1 }}</b>
          <SimulationParticipantAvatar :variant-type="bot.variantType" :size="20" />
          <strong class="rank-name">{{ bot.variantName }}</strong>
          <div class="rank-performance">
            <span
              :class="{
                positive: bot.cumulativeReturnPercent > 0,
                negative: bot.cumulativeReturnPercent < 0,
              }"
            >
              {{ formatSignedCurrency(bot.profitLoss) }}
            </span>
            <strong
              :class="{
                positive: bot.cumulativeReturnPercent > 0,
                negative: bot.cumulativeReturnPercent < 0,
              }"
            >
              {{ formatPercent(bot.cumulativeReturnPercent) }}
            </strong>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="next-step-btn" @click="goToNextStep">
      <span>결과 확인하러 가기</span>
      <AppIcon name="arrow-right" :size="16" />
    </button>
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
  flex-direction: column;
}

.live-header__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.speed-controls__label {
  color: #263a43;
  font-size: 11px;
  font-weight: 700;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid #dfe8eb;
  border-radius: 13px;
  background: #f7fafb;
}

.speed-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: #66777d;
  border-radius: 9px;
  cursor: pointer;
}

.speed-btn.active {
  background: #0b6b68;
  color: #ffffff;
  box-shadow: 0 4px 10px rgb(11 107 104 / 20%);
}

.play-btn {
  border: none;
  background: #263a43;
  color: #ffffff;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.play-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.live-trade-alert {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  width: 100%;
  align-items: center;
  gap: 11px;
  padding: 12px 13px;
  border: 1px solid #b9e2e1;
  border-radius: 14px;
  background: #f1fbfa;
  color: #263a43;
  font: inherit;
  text-align: left;
  cursor: pointer;
  animation: trade-alert-in 0.36s ease-out;
}

.live-trade-alert.is-waiting {
  border-color: #dce5e8;
  background: #f7f9fa;
  cursor: default;
}

.live-trade-alert__avatar {
  align-self: start;
}

.live-trade-alert__waiting-icon {
  display: inline-grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  background: #e9eff1;
  color: #91a0a6;
}

.live-trade-alert__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.live-trade-alert__content small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #078f90;
  font-size: 9px;
  font-weight: 700;
}

.live-trade-alert__content small b {
  padding: 3px 5px;
  border-radius: 5px;
  background: #fee8e9;
  color: #df464e;
  font-size: 8px;
}

.live-trade-alert__content small b.is-sell {
  background: #e8f1fc;
  color: #3478d4;
}

.live-trade-alert.is-waiting small {
  color: #819197;
}

.live-trade-alert__content strong {
  overflow: hidden;
  color: #182a30;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-trade-alert__content > span {
  color: #819197;
  font-family: var(--font-mono);
  font-size: 9px;
}

.live-trade-alert__reason {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  color: #5f737b;
  font-size: 9px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.live-trade-alert__reason b {
  margin-right: 4px;
  color: #078f90;
}

@keyframes trade-alert-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.simulation-conditions {
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  border: 1px solid #dce5e8;
  border-radius: 16px;
  background: #fff;
}

.simulation-condition {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 13px 14px;
}

.simulation-condition + .simulation-condition {
  border-top: 1px solid #e7edef;
}

.simulation-condition .app-icon {
  color: #0ea5a6;
}

.simulation-condition div {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.simulation-condition span {
  color: #87979d;
  font-size: 11px;
}

.simulation-condition strong {
  overflow: hidden;
  color: #182a30;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rankings-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px 16px 12px;
  background: #ffffff;
  border: 1px solid #dde5e8;
  border-radius: 16px;
}

.rankings-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #263a43;
}

.rankings-box__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.rankings-box__header > span {
  color: #97a3a7;
  font-size: 11px;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rank-row {
  display: grid;
  grid-template-columns: 25px 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  border-bottom: 1px solid #edf1f2;
}

.rank-row:last-child {
  border-bottom: 0;
}

.rank-badge {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: #69787e;
  background: #f1f2ef;
  border-radius: 7px;
}

.rank-badge--top {
  color: #0a908f;
  background: #e6f7f6;
}

.rank-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.rank-dot--actual_user { background: #395563; }
.rank-dot--personal_bot { background: #0ea5a6; }
.rank-dot--famous_strategy { background: #91a8b2; }
.rank-dot--random_bot { background: #b18bd5; }

.rank-name {
  overflow: hidden;
  color: #263a43;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-performance {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
}

.rank-performance strong {
  min-width: 42px;
  font-size: 11px;
  text-align: right;
}

.positive {
  color: #ff4d55;
}

.negative {
  color: #2f70d9;
}

.next-step-btn {
  position: fixed;
  z-index: 30;
  bottom: 16px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: min(calc(100% - 40px), 350px);
  min-height: 48px;
  padding: 12px 18px;
  border: 0;
  border-radius: 14px;
  background: #263f48;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgb(38 58 67 / 18%);
  transform: translateX(-50%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.next-step-btn:hover {
  transform: translate(-50%, -1px);
  background: #1f363e;
  box-shadow: 0 10px 24px rgb(31 54 62 / 24%);
}

.next-step-btn:active {
  transform: translateX(-50%);
}

.next-step-btn:focus-visible {
  outline: 2px solid #0ea5a6;
  outline-offset: 2px;
}

.live-runner-container.has-next-step {
  padding-bottom: 72px;
}
</style>
