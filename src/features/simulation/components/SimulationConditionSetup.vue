<script setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import SimulationStepHeading from '@/features/simulation/components/SimulationStepHeading.vue'
import { useSimulationConditions } from '@/features/simulation/composables/useSimulationConditions'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const props = defineProps({
  periodStart: {
    type: String,
    required: true,
  },
  periodEnd: {
    type: String,
    required: true,
  },
  totalDays: {
    type: Number,
    default: 150,
  },
  accountId: {
    type: Number,
    required: true,
  },
  isPending: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start'])
const simulationStore = useSimulationStore()
const {
  selectedComparatorTypes,
  isBotCompiling,
  isBotCompileComplete,
  isBotCompileFailed,
  botCompileProgress,
} = storeToRefs(simulationStore)

/**
 * 봇 선택 화면과 한 화면으로 합쳐지면서, 선택을 바꿀 때마다 참가자 수와 초기자금이
 * 즉시 갱신돼야 한다. useSimulationConditions가 props를 반응형으로 읽으므로
 * selectedBotTypes만 스토어를 보게 getter로 위임한다.
 */
const conditionSource = {
  get periodStart() {
    return props.periodStart
  },
  get periodEnd() {
    return props.periodEnd
  },
  get accountId() {
    return props.accountId
  },
  get selectedBotTypes() {
    return selectedComparatorTypes.value
  },
}

const {
  startOffset,
  endOffset,
  currentInitialCapital,
  capitalLoading,
  capitalError,
  snapshotDate,
  initialHoldings,
  maxOffset,
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
} = useSimulationConditions(conditionSource, simulationStore.fetchInitialCapital)

// 개인봇 컴파일이 실패해도 나머지 참가자만으로 진행할 수 있다 — 백엔드가
// personalBotId 없이 온 /run 요청에서 PERSONAL_BOT을 자동 제외하고
// excludedParticipants로 이유를 알려준다 (investory-simulation-api#20).
// 그래서 시작 가능 여부는 "컴파일 완료"가 아니라 "컴파일이 끝난 상태
// (완료든 실패든)"만 있으면 된다.
const canStart = computed(
  () =>
    !props.isPending &&
    !isBotCompiling.value &&
    (isBotCompileComplete.value || isBotCompileFailed.value) &&
    !capitalLoading.value &&
    !capitalError.value &&
    currentInitialCapital.value !== null,
)

function handlePrimaryAction() {
  if (!canStart.value) return
  emit('start', getConditions())
}

function handleRetryCompile() {
  void simulationStore.compilePersonalBot()
}

function formatDateKey(value) {
  if (!value) return ''
  return value.replaceAll('-', '. ')
}
</script>

<template>
  <div class="setup-page">
    <section class="period-card">
      <SimulationStepHeading step="02" title="시뮬레이션 기간">
        <template #meta>총 {{ selectedDays }}일</template>
      </SimulationStepHeading>

      <div class="date-span">
        <div class="date-span__end">
          <span>시작</span>
          <strong>{{ formatDate(selectedStartDate) }}</strong>
        </div>
        <AppIcon name="arrow-right" :size="15" class="date-span__arrow" />
        <div class="date-span__end date-span__end--to">
          <span>종료</span>
          <strong>{{ formatDate(selectedEndDate) }}</strong>
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
        <span>{{ formatDate(dateAtOffset(0)) }}</span>
        <span>{{ formatDate(dateAtOffset(maxOffset)) }}</span>
      </div>

      <p class="period-hint">
        <AppIcon name="calendar-range" :size="13" />
        <span>거래·일지가 모두 있는 구간에서만 선택할 수 있어요.</span>
      </p>
    </section>

    <section class="capital-card" aria-label="초기 자금">
      <div class="capital-card__head">
        <span class="capital-card__icon" aria-hidden="true">
          <AppIcon name="swords" :size="16" />
        </span>
        <span class="capital-card__label">1인당 초기 자금</span>
        <span class="capital-card__badge">{{ participantCount }}명 동일</span>
      </div>

      <p v-if="capitalLoading" class="capital-status capital-status--loading" role="status">
        <AppIcon name="loader-circle" :size="14" class="pending-spinner" />
        초기자금 갱신 중
      </p>
      <p v-else-if="capitalError" class="capital-status capital-status--error" role="alert">
        {{ capitalError }}
      </p>
      <template v-else-if="currentInitialCapital !== null">
        <strong class="capital-card__amount">
          <i>₩</i>{{ formatCurrency(currentInitialCapital) }}
        </strong>
        <small class="capital-card__meta">
          보유 기준 {{ formatDateKey(snapshotDate) }} · {{ initialHoldings.length }}종목 · 실제 나
          포함 {{ participantCount }}명에게 동일 적용
        </small>
      </template>
    </section>

    <div class="setup-action">
      <p v-if="isBotCompileFailed" class="setup-action__notice" role="status">
        <AppIcon name="triangle-alert" :size="13" />
        <span>투자봇 생성에 실패했어요. 제외하고 진행하거나 다시 생성해보세요.</span>
      </p>

      <BaseButton
        variant="primary"
        full-width
        aria-live="polite"
        :disabled="!canStart"
        @click="handlePrimaryAction"
      >
        <template v-if="isBotCompileFailed">
          <span>투자봇 제외하고 진행하기</span>
          <AppIcon name="rocket" :size="17" />
        </template>
        <template v-else-if="!isBotCompileComplete">
          <AppIcon name="loader-circle" :size="17" class="pending-spinner" />
          <span>{{ `투자봇 생성 중 ${botCompileProgress}%` }}</span>
        </template>
        <template v-else-if="isPending">
          <AppIcon name="loader-circle" :size="17" class="pending-spinner" />
          <span>시뮬레이션 준비 중</span>
        </template>
        <template v-else-if="capitalLoading">
          <AppIcon name="loader-circle" :size="17" class="pending-spinner" />
          <span>초기자금 확인 중</span>
        </template>
        <template v-else>
          <span>{{ participantCount }}명으로 시뮬레이션 시작</span>
          <AppIcon name="rocket" :size="17" />
        </template>
      </BaseButton>

      <BaseButton v-if="isBotCompileFailed" variant="ghost" full-width @click="handleRetryCompile">
        <AppIcon name="refresh-cw" :size="15" />
        <span>투자봇 다시 생성하기</span>
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
          <div class="pending-card__hero" aria-hidden="true">
            <img
              class="pending-card__hero-image"
              src="/assets/images/simulation/live-race-hero.png"
              alt=""
            />
            <span class="pending-card__hero-status">
              <AppIcon name="loader-circle" :size="12" class="pending-spinner" /> LIVE MATCH
            </span>
          </div>

          <span class="pending-card__eyebrow"
            ><AppIcon name="sparkles" :size="12" /> 라이브 대시</span
          >
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
  /* 컴파일 실패 시 하단 액션 바가 경고문구 + 버튼 2개로 늘어나므로,
     그 경우에도 위 콘텐츠(초기자금 카드 등)가 안 가려지도록 여유를 둔다. */
  padding-bottom: calc(168px + env(safe-area-inset-bottom, 0px));
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
  overflow: hidden;
  padding: 0 20px 22px;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 24px;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 24px 64px rgb(5 20 25 / 32%);
  text-align: center;
}

.pending-card__hero {
  position: relative;
  width: calc(100% + 40px);
  aspect-ratio: 1;
  overflow: hidden;
  margin-bottom: 15px;
  background: #081a28;
}

.pending-card__hero::after {
  position: absolute;
  inset: 0;
  background: rgb(3 16 24 / 16%);
  content: '';
  pointer-events: none;
}

.pending-card__hero-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.pending-card__hero-status {
  position: absolute;
  top: 12px;
  left: 14px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 999px;
  background: rgb(4 22 31 / 72%);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.pending-card__eyebrow {
  color: #0b8f8b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
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

.date-span {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
  padding: 12px 14px;
  border: 1px solid #e6edee;
  border-radius: 13px;
  background: #f8fbfb;
}

.date-span__end {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.date-span__end--to {
  align-items: flex-end;
}

/* 실제로 고르는 값이라 날짜를 가장 크게 두고, 라벨은 한 단계 낮춘다. */
.date-span__end span {
  color: #8b9a9f;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.date-span__end strong {
  overflow: hidden;
  color: #20373f;
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-span__arrow {
  flex: 0 0 auto;
  color: #a9bcc1;
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
  padding: 0 4px;
  color: #adbabe;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
}

.period-hint {
  display: flex;
  margin: 12px 0 0;
  align-items: center;
  gap: 6px;
  color: #97a5a9;
  font-size: 11px;
  line-height: 1.4;
}

/* 금액이 이 카드의 핵심인데 이전에는 12px 본문 안에 섞여 잘려 나가기까지 했다.
   금액만 큰 모노 숫자로 끌어올리고 나머지는 라벨/메타로 내린다. */
.capital-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 15px 14px;
  border: 1px solid #bfe6e3;
  border-radius: 14px;
  background: #f3fbfa;
}

.capital-card__head {
  display: flex;
  align-items: center;
  gap: 7px;
}

.capital-card__icon {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #087f7c;
  background: #e2f7f5;
}

.capital-card__label {
  flex: 1;
  color: #3f565e;
  font-size: 12px;
  font-weight: 800;
}

.capital-card__badge {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  color: #087f7c;
  background: #e2f7f5;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.capital-card__amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #16323b;
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 850;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.capital-card__amount i {
  color: #6f8a90;
  font-size: 17px;
  font-style: normal;
  font-weight: 800;
}

.capital-card__meta {
  color: #8b999d;
  font-size: 11px;
  line-height: 1.45;
  word-break: keep-all;
}

.capital-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0;
  font-size: 12px;
  font-weight: 700;
}

.capital-status--loading {
  color: #087f7c;
}

.capital-status--error {
  color: #c35050;
  line-height: 1.4;
  word-break: keep-all;
}

.setup-action {
  position: fixed;
  z-index: 30;
  /* 세이프에어리어가 없는 기기/브라우저에서도 화면 끝에 딱 붙어 보이지
     않도록 최소 여백을 고정으로 보장하고, 노치/홈 인디케이터가 있으면
     그 위에 추가로 띄운다. */
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  display: flex;
  width: min(calc(100% - 40px), 350px);
  flex-direction: column;
  gap: 8px;
  transform: translateX(-50%);
}

.setup-action__notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 2px;
  color: #c35050;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  word-break: keep-all;
}

@media (prefers-reduced-motion: reduce) {
  .pending-spinner,
  .pending-steps span.is-active b,
  .pending-progress i {
    animation: none;
  }
}
</style>
