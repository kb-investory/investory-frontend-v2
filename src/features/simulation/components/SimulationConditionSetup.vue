<script setup>
import { computed, ref, watch } from 'vue'

import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const props = defineProps({
  periodStart: {
    type: String,
    default: '2026-03-01',
  },
  periodEnd: {
    type: String,
    default: '2026-07-29',
  },
  totalDays: {
    type: Number,
    default: 150,
  },
  initialCapital: {
    type: Number,
    default: 5000000,
  },
  selectedBotTypes: {
    type: Array,
    default: () => ['FAMOUS_STRATEGY', 'RANDOM_BOT'],
  },
})

const emit = defineEmits(['start'])

const startOffset = ref(0)
const endOffset = ref(1)

const maxOffset = computed(() => {
  const start = new Date(`${props.periodStart}T00:00:00`)
  const end = new Date(`${props.periodEnd}T00:00:00`)
  return Math.max(1, Math.round((end - start) / DAY_IN_MS))
})

watch(
  maxOffset,
  (value) => {
    startOffset.value = 0
    endOffset.value = value
  },
  { immediate: true },
)

const participants = computed(() => {
  const items = [
    { type: 'ACTUAL_USER', className: 'PLAYER', name: '실제 나', tone: 'actual' },
    { type: 'PERSONAL_BOT', className: 'PERSONAL', name: '나의 봇 v3', tone: 'personal' },
  ]

  if (props.selectedBotTypes.includes('FAMOUS_STRATEGY')) {
    items.push({
      type: 'FAMOUS_STRATEGY',
      className: 'LEGEND',
      name: '유명 투자자',
      tone: 'legend',
    })
  }
  if (props.selectedBotTypes.includes('RANDOM_BOT')) {
    items.push({ type: 'RANDOM_BOT', className: 'WILD', name: '원숭이', tone: 'wild' })
  }
  return items
})

const participantCount = computed(() => participants.value.length)
const selectedDays = computed(() => endOffset.value - startOffset.value + 1)
const startPercent = computed(() => (startOffset.value / maxOffset.value) * 100)
const endPercent = computed(() => (endOffset.value / maxOffset.value) * 100)

function dateAtOffset(offset) {
  const date = new Date(`${props.periodStart}T00:00:00`)
  date.setDate(date.getDate() + offset)
  return date
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}`
}

function toApiDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedStartDate = computed(() => dateAtOffset(startOffset.value))
const selectedEndDate = computed(() => dateAtOffset(endOffset.value))

function updateStart(event) {
  startOffset.value = Math.min(Number(event.target.value), endOffset.value - 1)
}

function updateEnd(event) {
  endOffset.value = Math.max(Number(event.target.value), startOffset.value + 1)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function startSimulation() {
  emit('start', {
    periodStart: toApiDate(selectedStartDate.value),
    periodEnd: toApiDate(selectedEndDate.value),
    initialCapital: props.initialCapital,
  })
}
</script>

<template>
  <div class="setup-page">
    <header class="setup-intro">
      <span class="setup-intro__eyebrow">
        <AppIcon name="flag" :size="13" />
        FINAL SETUP
      </span>
      <h2>참가자와 시작점을 확인해요</h2>
      <p>시작점을 옮기면 모든 참가자가 같은 시점에서 출발해요.</p>
    </header>

    <section class="participants-panel">
      <div class="participants-panel__header">
        <span>PARTICIPANTS · {{ participantCount }}</span>
        <strong>READY</strong>
      </div>

      <div class="participant-list" :class="{ 'is-compact': participantCount === 4 }">
        <article
          v-for="participant in participants"
          :key="participant.type"
          class="participant-card"
          :class="`participant-card--${participant.tone}`"
        >
          <div class="participant-card__avatar">
            <SimulationParticipantAvatar :variant-type="participant.type" :size="38" />
          </div>
          <span>{{ participant.className }}</span>
          <strong>{{ participant.name }}</strong>
          <small><i></i>준비 완료</small>
        </article>
      </div>
    </section>

    <section class="period-card">
      <div class="period-card__header">
        <div>
          <h3>시뮬레이션 기간</h3>
          <p>양쪽 핸들을 움직여 기간을 정하세요</p>
        </div>
        <strong>총 {{ selectedDays }}일</strong>
      </div>

      <div class="date-summary">
        <div class="date-summary__item date-summary__item--start">
          <span><i></i>시작</span>
          <strong>{{ formatDate(selectedStartDate) }}</strong>
          <small>첫 매수 일지 · 09:00</small>
        </div>
        <div class="date-summary__item date-summary__item--end">
          <span><i></i>종료</span>
          <strong>{{ formatDate(selectedEndDate) }}</strong>
          <small>최근 완료 일지 · 15:30</small>
        </div>
      </div>

      <div class="date-range">
        <div class="date-range__track"></div>
        <div
          class="date-range__selected"
          :style="{ left: `${startPercent}%`, right: `${100 - endPercent}%` }"
        ></div>
        <input
          :value="startOffset"
          type="range"
          min="0"
          :max="maxOffset"
          aria-label="시뮬레이션 시작일"
          @input="updateStart"
        />
        <input
          :value="endOffset"
          type="range"
          min="0"
          :max="maxOffset"
          aria-label="시뮬레이션 종료일"
          @input="updateEnd"
        />
      </div>

      <div class="range-limits">
        <span>최초&nbsp; {{ formatDate(dateAtOffset(0)) }}</span>
        <span>최근&nbsp; {{ formatDate(dateAtOffset(maxOffset)) }}</span>
      </div>

      <div class="period-hint">
        <AppIcon name="calendar-range" :size="13" />
        <span>거래·일지가 모두 있는 구간에서만 선택할 수 있어요.</span>
      </div>
    </section>

    <section class="same-condition">
      <div class="same-condition__icon">
        <AppIcon name="swords" :size="19" />
      </div>
      <div>
        <strong>{{ participantCount }}명 · 같은 시점 · 같은 투자금</strong>
        <span>
          실제 나 + 투자봇 {{ participantCount - 1 }}명 · ₩{{ formatCurrency(initialCapital) }}
        </span>
      </div>
      <AppIcon name="circle-check" :size="17" />
    </section>

    <div class="setup-action">
      <BaseButton variant="primary" full-width @click="startSimulation">
        <span>이 조건으로 시뮬레이션 시작</span>
        <AppIcon name="rocket" :size="17" />
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.setup-page {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 76px;
}

.setup-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup-intro__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #087f7c;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 700;
}

.setup-intro h2 {
  margin: 0;
  color: #181817;
  font-family: 'Funnel Sans', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.setup-intro p {
  margin: 0;
  color: #8c8c87;
  font-size: 10px;
}

.participants-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 13px 12px 16px;
  border-radius: 16px;
  background: #263a43;
}

.participants-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.participants-panel__header > span {
  color: #a8bdc5;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 700;
}

.participants-panel__header > strong {
  padding: 5px 12px;
  border-radius: 999px;
  background: #34515c;
  color: #74d3cf;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
}

.participant-list {
  display: flex;
  justify-content: center;
  gap: 9px;
}

.participant-card {
  display: flex;
  width: 76px;
  min-width: 0;
  height: 121px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 7px 16px rgb(10 27 34 / 14%);
  animation: participant-float 3.5s ease-in-out infinite;
  animation-delay: 0.32s;
  will-change: transform;
}

.participant-card:nth-child(2) {
  animation-delay: 0s;
}

.participant-card:nth-child(3) {
  animation-delay: 0.32s;
}

.participant-list.is-compact .participant-card:nth-child(2),
.participant-list.is-compact .participant-card:nth-child(3) {
  animation-delay: 0s;
}

.participant-list.is-compact .participant-card:nth-child(1),
.participant-list.is-compact .participant-card:nth-child(4) {
  animation-delay: 0.32s;
}

.participant-list.is-compact .participant-card {
  width: calc((100% - 27px) / 4);
}

.participant-card__avatar {
  display: grid;
  width: 48px;
  height: 43px;
  place-items: center;
  border-radius: 10px;
  background: #f3f6f6;
}

.participant-card--personal .participant-card__avatar {
  background: #e4eff2;
}

.participant-card--legend .participant-card__avatar {
  background: #e7f8f6;
}

.participant-card--wild .participant-card__avatar {
  background: #f4ebfb;
}

.participant-card > span {
  color: #263a43;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
  font-weight: 700;
}

.participant-card--personal > span {
  padding: 3px 5px;
  border-radius: 4px;
  background: #e7f0f2;
}

.participant-card--legend > span {
  color: #087f7c;
}

.participant-card--wild > span {
  color: #6d4d8f;
}

.participant-card > strong {
  overflow: hidden;
  max-width: calc(100% - 8px);
  color: #181817;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-card > small {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #8a999e;
  font-size: 8px;
  white-space: nowrap;
}

.participant-card > small i,
.date-summary__item span i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #24b78f;
}

.period-card {
  padding: 15px;
  border: 1px solid #dce6e9;
  border-radius: 16px;
  background: #fff;
}

.period-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.period-card__header h3 {
  margin: 0 0 5px;
  color: #263a43;
  font-size: 14px;
  font-weight: 800;
}

.period-card__header p {
  margin: 0;
  color: #94948e;
  font-size: 9px;
}

.period-card__header > strong {
  padding: 6px 9px;
  border-radius: 10px;
  background: #effaf9;
  color: #087f7c;
  font-size: 9px;
}

.date-summary {
  display: grid;
  margin-top: 14px;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.date-summary__item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 11px 10px;
  border-radius: 12px;
  background: #f1f5f6;
}

.date-summary__item--end {
  background: #f5f3ef;
}

.date-summary__item span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #6f7f85;
  font-size: 9px;
  font-weight: 700;
}

.date-summary__item--end span i {
  background: #40545b;
}

.date-summary__item strong {
  overflow: hidden;
  color: #181817;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-summary__item small {
  overflow: hidden;
  color: #a0a09a;
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-range {
  position: relative;
  height: 34px;
  margin: 8px 6px 0;
}

.date-range__track,
.date-range__selected {
  position: absolute;
  top: 16px;
  height: 4px;
  border-radius: 999px;
}

.date-range__track {
  right: 0;
  left: 0;
  background: #dce6e9;
}

.date-range__selected {
  z-index: 1;
  background: #0b8f8b;
}

.date-range input {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100%;
  height: 34px;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.date-range input::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
  appearance: none;
  border: 4px solid #0b8f8b;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 5px rgb(38 58 67 / 16%);
  pointer-events: auto;
  cursor: grab;
}

.date-range input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 4px solid #0b8f8b;
  border-radius: 50%;
  background: #fff;
  pointer-events: auto;
  cursor: grab;
}

.range-limits {
  display: flex;
  justify-content: space-between;
  color: #a0a09a;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px;
}

.period-hint {
  display: flex;
  margin-top: 13px;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 9px;
  background: #f6f8f9;
  color: #89969a;
  font-size: 8px;
}

.same-condition {
  display: flex;
  min-height: 72px;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border: 1px solid #bfe6e3;
  border-radius: 14px;
  background: #f3fbfa;
  color: #087f7c;
}

.same-condition__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: #e2f7f5;
}

.same-condition > div:nth-child(2) {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.same-condition strong {
  color: #263a43;
  font-size: 11px;
}

.same-condition span {
  overflow: hidden;
  color: #77868b;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setup-action {
  position: fixed;
  z-index: 30;
  bottom: 16px;
  left: 50%;
  width: min(calc(100% - 40px), 350px);
  transform: translateX(-50%);
}

@keyframes participant-float {
  0%,
  100% {
    transform: translateY(0);
  }

  38% {
    transform: translateY(-4px);
  }

  72% {
    transform: translateY(1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .participant-card {
    animation: none;
  }
}
</style>
