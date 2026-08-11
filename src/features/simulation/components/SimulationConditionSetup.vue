<script setup>
import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import { useSimulationConditions } from '@/features/simulation/composables/useSimulationConditions'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

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
  isPending: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start'])
const simulationStore = useSimulationStore()
const {
  startOffset,
  endOffset,
  currentInitialCapital,
  maxOffset,
  participants,
  participantCount,
  selectedDays,
  startPercent,
  endPercent,
  selectedStartDate,
  selectedEndDate,
  dateAtOffset,
  updateStart,
  updateEnd,
  formatDate,
  formatCurrency,
  getConditions,
} = useSimulationConditions(props, simulationStore.fetchInitialCapital)

function startSimulation() {
  if (props.isPending) return

  emit('start', getConditions())
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
          실제 나 + 투자봇 {{ participantCount - 1 }}명 · ₩{{
            formatCurrency(currentInitialCapital)
          }}
        </span>
      </div>
      <AppIcon name="circle-check" :size="17" />
    </section>

    <div class="setup-action">
      <BaseButton variant="primary" full-width :disabled="isPending" @click="startSimulation">
        <template v-if="isPending">
          <AppIcon name="loader-circle" :size="17" class="pending-spinner" />
          <span>시뮬레이션 준비 중</span>
        </template>
        <template v-else>
          <span>이 조건으로 시뮬레이션 시작</span>
          <AppIcon name="rocket" :size="17" />
        </template>
      </BaseButton>
    </div>

    <Transition name="pending-fade">
      <div
        v-if="isPending"
        class="pending-overlay"
        role="status"
        aria-live="polite"
        aria-label="시뮬레이션 준비 중"
      >
        <div class="pending-card">
          <span class="pending-card__eyebrow">SETTING UP THE RACE</span>

          <div class="pending-character" aria-hidden="true">
            <span class="pending-character__orbit pending-character__orbit--one"></span>
            <span class="pending-character__orbit pending-character__orbit--two"></span>
            <span class="pending-character__glow"></span>
            <span class="pending-character__avatar">
              <SimulationParticipantAvatar variant-type="PERSONAL_BOT" :size="72" />
            </span>
            <i class="pending-character__dot pending-character__dot--one"></i>
            <i class="pending-character__dot pending-character__dot--two"></i>
            <i class="pending-character__dot pending-character__dot--three"></i>
          </div>

          <h3>참가자들이 출발선에 모이고 있어요</h3>
          <p>
            선택한 {{ participantCount }}명의 투자 기록과<br />
            원칙을 같은 조건으로 맞추는 중이에요.
          </p>

          <div class="pending-steps" aria-hidden="true">
            <span class="is-complete"><AppIcon name="check" :size="11" /> 조건 확인</span>
            <i></i>
            <span class="is-active"><b></b> 전략 준비</span>
            <i></i>
            <span><b></b> 출발</span>
          </div>

          <div class="pending-progress" aria-hidden="true"><i></i></div>
          <small>잠시만 기다려 주세요 · 화면을 닫지 않아도 돼요</small>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.setup-page {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 76px;
}

.pending-spinner {
  animation: pending-spin 0.85s linear infinite;
}

.pending-overlay {
  position: fixed;
  z-index: 140;
  inset: 0;
  display: flex;
  width: min(100%, 390px);
  align-items: center;
  justify-content: center;
  margin: auto;
  padding: 24px;
  background: rgb(18 31 36 / 64%);
  backdrop-filter: blur(3px);
}

.pending-card {
  display: flex;
  width: 100%;
  max-width: 330px;
  flex-direction: column;
  align-items: center;
  padding: 27px 20px 22px;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 24px;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 24px 64px rgb(5 20 25 / 32%);
  text-align: center;
}

.pending-card__eyebrow {
  color: #0b8f8b;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 800;
  letter-spacing: 0.1em;
}

.pending-character {
  position: relative;
  display: grid;
  width: 142px;
  height: 142px;
  margin: 10px 0 4px;
  place-items: center;
}

.pending-character__glow {
  position: absolute;
  width: 94px;
  height: 94px;
  border-radius: 50%;
  background: #dff5f3;
  box-shadow: 0 0 42px rgb(11 143 139 / 24%);
  animation: pending-glow 1.7s ease-in-out infinite;
}

.pending-character__avatar {
  position: relative;
  z-index: 2;
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border: 5px solid #fff;
  border-radius: 50%;
  background: #e8f7f6;
  box-shadow: 0 10px 24px rgb(38 58 67 / 18%);
  animation: pending-float 1.8s ease-in-out infinite;
}

.pending-character__orbit {
  position: absolute;
  border: 1px solid #b9dcd9;
  border-radius: 50%;
}

.pending-character__orbit--one {
  width: 116px;
  height: 116px;
  animation: pending-orbit 5s linear infinite;
}

.pending-character__orbit--two {
  width: 140px;
  height: 140px;
  border-style: dashed;
  opacity: 0.52;
  animation: pending-orbit 8s linear infinite reverse;
}

.pending-character__dot {
  position: absolute;
  z-index: 3;
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #0b8f8b;
  box-shadow: 0 2px 5px rgb(38 58 67 / 18%);
}

.pending-character__dot--one {
  top: 21px;
  right: 31px;
  animation: pending-dot 1.2s ease-in-out infinite;
}

.pending-character__dot--two {
  bottom: 21px;
  left: 30px;
  background: #e8b931;
  animation: pending-dot 1.2s 0.3s ease-in-out infinite;
}

.pending-character__dot--three {
  right: 9px;
  bottom: 57px;
  width: 6px;
  height: 6px;
  background: #7b83d5;
  animation: pending-dot 1.2s 0.6s ease-in-out infinite;
}

.pending-card h3 {
  margin: 0;
  color: #263a43;
  font-size: var(--font-size-body);
  font-weight: 800;
  letter-spacing: -0.035em;
}

.pending-card > p {
  margin: 7px 0 17px;
  color: #77898f;
  font-size: var(--font-size-caption);
  line-height: 1.55;
}

.pending-steps {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.pending-steps span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a0adb1;
  font-size: var(--font-size-caption);
  font-weight: 700;
  white-space: nowrap;
}

.pending-steps span.is-complete {
  color: #0b8f8b;
}

.pending-steps span.is-active {
  color: #40555d;
}

.pending-steps span b {
  width: 7px;
  height: 7px;
  border: 2px solid #c5d0d3;
  border-radius: 50%;
}

.pending-steps span.is-active b {
  border-color: #0b8f8b;
  background: #0b8f8b;
  box-shadow: 0 0 0 3px #dff3f1;
  animation: pending-dot 1.15s ease-in-out infinite;
}

.pending-steps > i {
  width: 15px;
  height: 1px;
  background: #dfe6e8;
}

.pending-progress {
  width: 100%;
  height: 5px;
  margin: 15px 0 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8eeee;
}

.pending-progress i {
  display: block;
  width: 38%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0b8f8b, #65c9c4);
  animation: pending-progress 1.35s ease-in-out infinite;
}

.pending-card > small {
  color: #98a5a9;
  font-size: var(--font-size-caption);
}

.pending-fade-enter-active,
.pending-fade-leave-active {
  transition: opacity 0.22s ease;
}

.pending-fade-enter-active .pending-card,
.pending-fade-leave-active .pending-card {
  transition:
    transform 0.25s ease,
    opacity 0.2s ease;
}

.pending-fade-enter-from,
.pending-fade-leave-to {
  opacity: 0;
}

.pending-fade-enter-from .pending-card,
.pending-fade-leave-to .pending-card {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

@keyframes pending-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pending-float {
  0%,
  100% {
    transform: translateY(2px);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pending-glow {
  0%,
  100% {
    opacity: 0.64;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}

@keyframes pending-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pending-dot {
  0%,
  100% {
    transform: scale(0.82);
  }
  50% {
    transform: scale(1.22);
  }
}

@keyframes pending-progress {
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(275%);
  }
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
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.setup-intro h2 {
  margin: 0;
  color: #181817;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.setup-intro p {
  margin: 0;
  color: #8c8c87;
  font-size: var(--font-size-caption);
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
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.participants-panel__header > strong {
  padding: 5px 12px;
  border-radius: 999px;
  background: #34515c;
  color: #74d3cf;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-card > small {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #8a999e;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-body);
  font-weight: 800;
}

.period-card__header p {
  margin: 0;
  color: #94948e;
  font-size: var(--font-size-caption);
}

.period-card__header > strong {
  padding: 6px 9px;
  border-radius: 10px;
  background: #effaf9;
  color: #087f7c;
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.date-summary__item--end span i {
  background: #40545b;
}

.date-summary__item strong {
  overflow: hidden;
  color: #181817;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-summary__item small {
  overflow: hidden;
  color: #a0a09a;
  font-size: var(--font-size-caption);
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
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
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
  font-size: var(--font-size-caption);
}

.same-condition span {
  overflow: hidden;
  color: #77868b;
  font-size: var(--font-size-caption);
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
  .participant-card,
  .pending-spinner,
  .pending-character__glow,
  .pending-character__avatar,
  .pending-character__orbit,
  .pending-character__dot,
  .pending-steps span.is-active b,
  .pending-progress i {
    animation: none;
  }
}
</style>
