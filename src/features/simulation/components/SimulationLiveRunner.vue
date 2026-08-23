<script setup>
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import SimulationLiveReturnChart from '@/features/simulation/components/SimulationLiveReturnChart.vue'
import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import {
  describeExcludedParticipants,
  resolveParticipantName,
} from '@/features/simulation/utils/participantName'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import InfoBanner from '@/shared/components/feedback/InfoBanner.vue'

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
  positionSnapshots: {
    type: Array,
    default: null,
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
  excludedParticipants: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['complete'])

const simulationStore = useSimulationStore()
const { comparators } = storeToRefs(simulationStore)

// 순위와 거래 알림이 서로 다른 이름을 쓰지 않도록 한 곳에서 해석한다.
function displayName(participant) {
  return resolveParticipantName(participant, comparators.value)
}

const exclusionNotice = computed(() =>
  describeExcludedParticipants(props.excludedParticipants, comparators.value),
)

const progress = ref(0)
const speed = ref(1)
const isPlaying = ref(true)
const liveChart = ref(null)
let timer = null
let lastFrameTime = null

const timelineDates = computed(() =>
  [
    ...new Set(
      (props.dailyPerformance ?? [])
        .map((snapshot) => snapshot.snapshotDate || snapshot.performanceDate)
        .filter(Boolean),
    ),
  ].sort(),
)

const performanceByVariant = computed(() => {
  const grouped = new Map()

  ;(props.dailyPerformance ?? []).forEach((snapshot) => {
    const snapshots = grouped.get(snapshot.simulationVariantId) ?? []
    snapshots.push(snapshot)
    grouped.set(snapshot.simulationVariantId, snapshots)
  })

  grouped.forEach((snapshots) =>
    snapshots.sort((a, b) =>
      (a.snapshotDate || a.performanceDate || '').localeCompare(
        b.snapshotDate || b.performanceDate || '',
      ),
    ),
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
    (snapshot) =>
      new Date(`${snapshot.snapshotDate || snapshot.performanceDate}T00:00:00`).getTime() >
      targetTimestamp,
  )
  if (nextIndex === 0) return snapshots[0].cumulativeReturnPercent
  if (nextIndex === -1) return snapshots.at(-1).cumulativeReturnPercent

  const currentSnapshot = snapshots[nextIndex - 1]
  const nextSnapshot = snapshots[nextIndex]
  const currentTimestamp = new Date(
    `${currentSnapshot.snapshotDate || currentSnapshot.performanceDate}T00:00:00`,
  ).getTime()
  const nextTimestamp = new Date(
    `${nextSnapshot.snapshotDate || nextSnapshot.performanceDate}T00:00:00`,
  ).getTime()
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

onMounted(() => {
  startSimulation()
})

onUnmounted(() => {
  if (timer) cancelAnimationFrame(timer)
})

function formatCurrency(val) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
}

function formatCompactCurrency(val) {
  const amount = Number(val) || 0
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(amount % 100000000 ? 1 : 0)}억원`
  if (amount >= 10000)
    return `${new Intl.NumberFormat('ko-KR').format(Math.round(amount / 10000))}만원`
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
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
        <div class="live-header__status" aria-live="polite">
          <i></i>
          <span v-if="progress >= 100">완료</span>
          <span v-else-if="isPlaying">진행 중</span>
          <span v-else>일시정지</span>
        </div>
        <div class="speed-controls">
          <button
            class="play-btn"
            type="button"
            :disabled="progress >= 100"
            :aria-label="isPlaying ? '일시정지' : '재생'"
            @click="togglePlay"
          >
            <AppIcon :name="isPlaying ? 'pause' : 'play'" :size="15" />
          </button>
          <button
            v-for="s in [1, 2, 5, 10]"
            :key="s"
            type="button"
            class="speed-btn"
            :class="{ active: speed === s }"
            :aria-label="`${s}배속`"
            :aria-pressed="speed === s"
            @click="setSpeed(s)"
          >
            {{ s }}×
          </button>
        </div>
      </div>
    </div>
    <section class="simulation-conditions" aria-label="시뮬레이션 조건">
      <div class="simulation-condition">
        <AppIcon name="calendar-range" :size="16" />
        <div>
          <span>기간</span>
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
          <strong>{{ formatCompactCurrency(initialCapital) }}</strong>
        </div>
      </div>
    </section>

    <InfoBanner
      v-if="exclusionNotice"
      title="일부 참가자가 이번엔 빠졌어요"
      :description="exclusionNotice"
    />

    <!-- Live Participant Rankings -->

    <SimulationLiveReturnChart
      ref="liveChart"
      :participants="participants"
      :daily-performance="dailyPerformance"
      :simulated-trades="simulatedTrades"
      :position-snapshots="positionSnapshots"
      :initial-capital="initialCapital"
      :progress="progress"
      :speed="speed"
      :total-days="150"
    />

    <div class="rankings-box">
      <div class="rankings-box__header">
        <div>
          <small>순위 변동</small>
          <h3 class="rankings-title">실시간 순위</h3>
        </div>
        <span>{{ Math.round(progress) }}% 지점 · 손익</span>
      </div>

      <TransitionGroup tag="div" name="rank" class="rankings-list">
        <div v-for="(bot, index) in rankedParticipants" :key="bot.variantId" class="rank-row">
          <b class="rank-badge" :class="{ 'rank-badge--top': index === 0 }">{{ index + 1 }}</b>
          <SimulationParticipantAvatar :variant-type="bot.variantType" :size="24" />
          <strong class="rank-name">{{ displayName(bot) }}</strong>
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
      </TransitionGroup>
    </div>

    <button type="button" class="next-step-btn" @click="goToNextStep">
      <span>{{ progress >= 100 ? '최종 결과 확인하기' : '결과 바로 확인하기' }}</span>
      <AppIcon :name="progress >= 100 ? 'flag' : 'arrow-right'" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.live-runner-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.live-header__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #bcd0d5;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.live-header__status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #14b8b3;
  box-shadow: 0 0 0 5px rgb(20 184 179 / 12%);
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 12px;
  background: rgb(7 31 39 / 36%);
}

.speed-btn {
  position: relative;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  color: #a9c0c6;
  border-radius: 9px;
  cursor: pointer;
}

.speed-btn.active {
  background: #14b8b3;
  color: #06272e;
  box-shadow: 0 4px 10px rgb(11 107 104 / 20%);
}

.play-btn {
  position: relative;
  border: none;
  background: rgb(255 255 255 / 92%);
  color: #17303a;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 버튼을 키우면 320px에서 컨트롤 줄이 넘치므로,
   보이는 크기는 두고 탭 영역만 44px로 넓힌다. */
.speed-btn::after,
.play-btn::after {
  position: absolute;
  inset: -5px;
  content: '';
}

.play-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

.simulation-conditions {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
  gap: 8px;
  border: 0;
  background: transparent;
}

.simulation-condition {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 42px;
  padding: 7px 9px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 12px;
  background: rgb(255 255 255 / 5%);
}

.simulation-condition + .simulation-condition {
  border-top-color: rgb(255 255 255 / 9%);
}

.simulation-condition .app-icon {
  color: #0ea5a6;
}

.simulation-condition div {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.simulation-condition span {
  color: #7f9aa2;
  font-size: 10px;
}

.simulation-condition strong {
  overflow: hidden;
  color: #eef5f6;
  font-family: var(--font-mono);
  max-width: 100%;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rankings-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 18px;
  background: rgb(8 31 39 / 32%);
}

.rankings-title {
  margin: 0;
  font-size: var(--font-size-body);
  font-weight: 700;
  color: #eef5f6;
}

.rankings-box__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.rankings-box__header > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rankings-box__header small {
  color: #5bc7c4;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.rankings-box__header > span {
  color: #8ba4ab;
  font-size: var(--font-size-caption);
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rank-row {
  display: grid;
  grid-template-columns: 26px 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 11px;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease;
}

.rank-row:first-child {
  border-color: rgb(115 216 214 / 17%);
  background: rgb(20 184 179 / 8%);
}

.rank-move {
  transition: transform 0.68s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.rank-badge {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  color: #b9ccd1;
  background: rgb(255 255 255 / 10%);
  border-radius: 7px;
}

.rank-badge--top {
  color: #06272e;
  background: #7fd8d6;
}

.rank-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.rank-dot--actual_user {
  background: #395563;
}
.rank-dot--personal_bot {
  background: #0ea5a6;
}
.rank-dot--famous_strategy {
  background: #91a8b2;
}
.rank-dot--random_bot {
  background: #b18bd5;
}

.rank-name {
  overflow: hidden;
  color: #eef5f6;
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
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.rank-performance strong {
  min-width: 42px;
  font-size: var(--font-size-caption);
  text-align: right;
}

.positive {
  color: #ff7b80;
}

.negative {
  color: #6aa8f5;
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
  height: 48px;
  min-height: 48px;
  padding: 12px 18px;
  border: 0;
  border-radius: 14px;
  background: #14b8b3;
  color: #06272e;
  font-size: var(--font-size-body);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 10px 24px rgb(6 39 46 / 38%);
  transform: translateX(-50%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.next-step-btn:hover {
  transform: translate(-50%, -1px);
  background: #29c5c0;
  box-shadow: 0 12px 28px rgb(6 39 46 / 42%);
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

@media (max-width: 350px) {
  .simulation-conditions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rank-move {
    transition: none;
  }
}
</style>
