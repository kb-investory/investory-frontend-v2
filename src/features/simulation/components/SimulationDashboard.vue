<script setup>
import { computed, ref } from 'vue'

import SimulationHeader from '@/features/simulation/components/SimulationHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const props = defineProps({
  overview: {
    type: Object,
    default: null,
  },
  latestResult: {
    type: Object,
    default: null,
  },
  historyRecords: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['startSimulation', 'selectRecord'])
const showHelpModal = ref(false)
const isHistoryExpanded = ref(false)

const displayRecords = computed(() => props.historyRecords ?? [])

const visibleHistoryRecords = computed(() =>
  isHistoryExpanded.value ? displayRecords.value : displayRecords.value.slice(0, 1),
)

const hasMoreHistory = computed(() => displayRecords.value.length > 1)

const latestSummary = computed(() => {
  const participants = Array.isArray(props.latestResult?.participantSummary)
    ? props.latestResult.participantSummary
    : []
  const winner = [...participants].sort(
    (a, b) => Number(b.cumulativeReturnPercent ?? 0) - Number(a.cumulativeReturnPercent ?? 0),
  )[0]
  const actual = participants.find((participant) => participant.variantType === 'ACTUAL_USER')
  const latestRecord = displayRecords.value[0]
  const periodStart = props.latestResult?.simulationRun?.periodStart
  const periodEnd = props.latestResult?.simulationRun?.periodEnd

  return {
    hasResult: Boolean(winner || latestRecord),
    date: formatDateLabel(periodEnd ?? latestRecord?.date),
    period:
      periodStart && periodEnd
        ? `${formatDateLabel(periodStart)} ~ ${formatDateLabel(periodEnd)}`
        : (latestRecord?.period ?? ''),
    winnerHeadline: formatWinnerHeadline(winner),
    winnerReturn: winner?.cumulativeReturnPercent ?? latestRecord?.returnPercent,
    actualReturn: actual?.cumulativeReturnPercent,
  }
})

function formatPercent(val) {
  const number = Number(val)
  if (!Number.isFinite(number)) return '—'
  const prefix = number > 0 ? '+' : ''
  return `${prefix}${number.toFixed(1)}%`
}

function formatDateLabel(value) {
  return value ? String(value).replaceAll('-', '.') : '최근'
}

function getParticipantLabel(participant) {
  const labels = {
    ACTUAL_USER: '실제 나',
    PERSONAL_BOT: '원칙 봇',
    FAMOUS_STRATEGY: '유명 투자자',
    RANDOM_BOT: '원숭이',
  }

  return labels[participant?.variantType] ?? participant?.variantName ?? '비교 전략'
}

function hasFinalConsonant(value) {
  const lastCharacter = String(value).trim().at(-1)
  if (!lastCharacter) return false

  const characterCode = lastCharacter.charCodeAt(0)
  const hangulStart = 0xac00
  const hangulEnd = 0xd7a3

  if (characterCode < hangulStart || characterCode > hangulEnd) return false
  return (characterCode - hangulStart) % 28 !== 0
}

function formatWinnerHeadline(participant) {
  if (participant?.variantType === 'ACTUAL_USER') return '내가 1위였어요'

  const label = getParticipantLabel(participant)
  const subjectParticle = hasFinalConsonant(label) ? '이' : '가'
  return `${label}${subjectParticle} 1위였어요`
}

function toggleHistory() {
  isHistoryExpanded.value = !isHistoryExpanded.value
}
</script>

<template>
  <div class="dashboard-page-container">
    <SimulationHeader :overview="overview" @start="emit('startSimulation')" />
    <div class="hero-card">
      <div class="hero-visual">
        <img
          class="hero-visual__image"
          src="/assets/images/simulation/simulation-hero.png"
          alt="네 가지 투자 전략이 나란히 앉아 투자 결과를 비교하는 모습"
        />

        <div class="hero-visual__scrim" aria-hidden="true"></div>

        <div class="hero-visual__caption">
          <span class="hero-kicker">나의 투자 선택을 다시 보기</span>
          <h2 class="hero-title">내 투자,<br />누구와 비교해볼까요?</h2>
        </div>

        <p class="hero-description hero-description--on-image">
          같은 날, 같은 돈으로<br />실제 나와 세 가지 투자 전략을 비교해요.
        </p>

        <button
          class="help-btn"
          type="button"
          aria-label="시뮬레이션 도움말"
          :aria-expanded="showHelpModal"
          @click="showHelpModal = !showHelpModal"
        >
          <AppIcon name="circle-help" :size="18" class="help-icon" />
        </button>
      </div>

      <div v-if="showHelpModal" class="help-panel">
        실제 거래는 바뀌지 않아요. 같은 기간과 자금으로 각 전략의 결과만 비교합니다.
      </div>

      <div class="hero-steps" aria-label="시뮬레이션 진행 방식">
        <div class="hero-step">
          <span>01</span>
          <strong>봇 선택</strong>
        </div>
        <AppIcon name="arrow-right" :size="13" class="hero-step-arrow" />
        <div class="hero-step">
          <span>02</span>
          <strong>기간 선택</strong>
        </div>
        <AppIcon name="arrow-right" :size="13" class="hero-step-arrow" />
        <div class="hero-step">
          <span>03</span>
          <strong>시뮬레이션</strong>
        </div>
        <AppIcon name="arrow-right" :size="13" class="hero-step-arrow" />
        <div class="hero-step">
          <span>04</span>
          <strong>결과 리포트</strong>
        </div>
      </div>

      <BaseButton variant="primary" full-width class="dark-cta" @click="emit('startSimulation')">
        <span>시뮬레이션 시작하기</span>
        <AppIcon name="arrow-right" :size="18" />
      </BaseButton>
    </div>

    <section
      v-if="latestSummary.hasResult"
      class="latest-result-card"
      aria-labelledby="latest-result-title"
    >
      <div class="latest-result-card__header">
        <div>
          <span class="section-kicker">최근 시뮬레이션</span>
          <h3 id="latest-result-title">이번 결과를 먼저 확인해보세요</h3>
        </div>
        <span class="latest-result-card__status">
          <AppIcon name="circle-check" :size="14" />
          완료
        </span>
      </div>

      <div class="latest-result-card__main">
        <div class="latest-result-card__winner">
          <span>{{ latestSummary.date }} 결과</span>
          <strong>{{ latestSummary.winnerHeadline }}</strong>
          <small>{{ latestSummary.period }}</small>
        </div>
        <strong
          class="latest-result-card__return"
          :class="{ positive: Number(latestSummary.winnerReturn) > 0 }"
        >
          {{ formatPercent(latestSummary.winnerReturn) }}
        </strong>
      </div>

      <div class="latest-result-card__footer">
        <span v-if="latestSummary.actualReturn != null">
          실제 나 {{ formatPercent(latestSummary.actualReturn) }} · 결과에서 차이를 찾아보세요
        </span>
        <span v-else>최근 실행 결과를 기준으로 다음 시뮬레이션을 준비해보세요.</span>
      </div>
    </section>

    <div class="history-section">
      <div class="history-header">
        <div>
          <span class="section-kicker">지난 결과</span>
          <h3 class="history-title">시뮬레이션 기록</h3>
        </div>
        <button v-if="hasMoreHistory" class="compare-link" type="button" @click="toggleHistory">
          {{ isHistoryExpanded ? '접기' : '전체 기록' }}
        </button>
      </div>

      <div
        v-if="displayRecords.length"
        class="history-list"
        :class="{ 'history-list--expanded': isHistoryExpanded }"
      >
        <div
          v-for="(rec, idx) in visibleHistoryRecords"
          :key="rec.simulationRunId || idx"
          class="history-item"
          @click="emit('selectRecord', rec)"
        >
          <div class="v-badge">{{ rec.version }}</div>

          <div class="item-info">
            <span class="item-date">{{ rec.date }}</span>
            <span class="item-period">{{ rec.period }}</span>
          </div>

          <div class="item-right">
            <span class="return-text" :class="{ positive: rec.returnPercent > 0 }">
              {{ formatPercent(rec.returnPercent) }}
            </span>
            <AppIcon name="chevron-right" :size="16" class="arrow-icon" />
          </div>
        </div>
      </div>

      <p v-if="!displayRecords.length" class="history-empty">
        시뮬레이션을 실행하면 결과가 여기에 쌓여요.
      </p>

      <button
        v-if="hasMoreHistory && !isHistoryExpanded"
        type="button"
        class="history-more"
        @click="toggleHistory"
      >
        이전 결과 {{ displayRecords.length - 1 }}개 더 보기
        <AppIcon name="chevron-down" :size="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 8px 20px 32px;
  background: transparent;
  box-sizing: border-box;
}

.hero-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  border: 0;
  background: transparent;
}

.hero-visual {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  background: #031823;
}

.hero-visual__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}

/* 상단 캔들 글로우 위에서도 흰 텍스트 대비를 확보한다.
   제목 글자 크기가 고정(px)이라 캡션 높이는 화면 폭과 무관하게 약 94px으로 일정하다.
   따라서 정지점도 %가 아닌 px로 잡아야 좁은 화면에서 캡션이 그라데이션 밖으로 밀려나지 않는다. */
.hero-visual__scrim {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 100%;
  background:
    linear-gradient(
      180deg,
      rgb(2 12 26 / 78%) 0px,
      rgb(2 12 26 / 68%) 58px,
      rgb(2 12 26 / 48%) 94px,
      rgb(2 12 26 / 0%) 140px
    ),
    linear-gradient(
      0deg,
      rgb(2 12 26 / 88%) 0px,
      rgb(2 12 26 / 70%) 40px,
      rgb(2 12 26 / 34%) 64px,
      rgb(2 12 26 / 0%) 88px
    );
  pointer-events: none;
}

.hero-visual__caption {
  position: absolute;
  top: 0;
  left: 0;
  /* 좁은 화면(320~375)에서도 제목이 의도한 2줄을 유지할 만큼 넓게.
     이 폭 안쪽은 스크림 적용 후 흰 텍스트 대비를 확인함. */
  max-width: 82%;
  padding: 18px 16px 0;
}

.hero-kicker,
.section-kicker {
  display: block;
  margin-bottom: 6px;
  color: #087f7c;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.hero-visual__caption .hero-kicker {
  color: #7cddd9;
}

.hero-title {
  margin: 0;
  color: #172d35;
  font-size: var(--font-size-title-md);
  font-weight: 850;
  line-height: 1.28;
  letter-spacing: -0.04em;
}

.hero-visual__caption .hero-title {
  color: #ffffff;
  text-shadow: 0 1px 10px rgb(2 12 26 / 55%);
  word-break: keep-all;
}

.help-btn {
  position: absolute;
  z-index: 1;
  top: 14px;
  right: 14px;
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 34%);
  border-radius: 50%;
  color: #ffffff;
  background: rgb(2 12 26 / 46%);
  backdrop-filter: blur(6px);
  cursor: pointer;
}

.hero-description {
  max-width: 300px;
  margin: 0 4px;
  color: #5d7379;
  font-size: var(--font-size-caption);
  line-height: 1.55;
  word-break: keep-all;
}

/* 제목과 함께 상단에 몰아넣으면 텍스트 블록이 139px이 되어 좁은 화면에서
   캐릭터 얼굴을 덮는다. 이미지에서 자연스럽게 어두운 두 번째 영역인
   하단 책상면에 배치해 상·하단을 나눠 쓴다. */
.hero-description--on-image {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: none;
  margin: 0;
  padding: 0 16px 14px;
  color: rgb(255 255 255 / 92%);
  text-shadow: 0 1px 8px rgb(2 12 26 / 70%);
}

.help-panel {
  padding: 10px 12px;
  border: 1px solid #c9e5e2;
  border-radius: 11px;
  color: var(--text-secondary);
  background: rgb(255 255 255 / 80%);
  font-size: var(--font-size-caption);
  line-height: 1.5;
}

/* 4단계로 늘어나면서 가로 배치로는 320px 화면에 들어가지 않는다.
   번호를 라벨 위로 쌓아 각 단계의 폭을 줄이고, 화살표는 고정 폭으로 둔다. */
.hero-steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 12px 0 2px;
  border-top: 1px solid rgb(8 127 124 / 14%);
}

.hero-step {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
}

.hero-step span {
  color: #0b8f8b;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
}

.hero-step strong {
  color: #29454d;
  font-size: 11px;
  font-weight: 750;
  word-break: keep-all;
}

.hero-step-arrow {
  flex: 0 0 auto;
  margin-top: 12px;
  color: #8ab7b4;
}

.dark-cta {
  min-height: 50px !important;
  margin-top: 2px;
  border-color: #263a43 !important;
  border-radius: 14px !important;
  color: #ffffff !important;
  background: #263a43 !important;
  font-weight: 800 !important;
}

.latest-result-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e0e8e8;
  border-radius: 17px;
  background: #ffffff;
  box-shadow: 0 5px 16px rgb(36 61 68 / 5%);
}

.latest-result-card__header,
.latest-result-card__main,
.latest-result-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.latest-result-card__header h3 {
  margin: 0;
  color: #20373f;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.latest-result-card__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #087f7c;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
}

.latest-result-card__winner {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.latest-result-card__winner span,
.latest-result-card__winner small {
  color: #839298;
  font-size: 10px;
}

.latest-result-card__winner strong {
  color: #20373f;
  font-size: 15px;
  font-weight: 800;
}

.latest-result-card__return {
  flex: 0 0 auto;
  color: #6a7b80;
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 850;
}

.latest-result-card__return.positive,
.return-text.positive {
  color: var(--brand-red);
}

.latest-result-card__footer {
  justify-content: flex-start;
  padding-top: 11px;
  border-top: 1px solid #edf1f1;
  color: #6d7d82;
  font-size: 11px;
  line-height: 1.45;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.history-header .section-kicker {
  margin-bottom: 4px;
}

.history-title {
  margin: 0;
  color: #20373f;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.compare-link,
.history-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  color: #087f7c;
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-caption);
  font-weight: 800;
}

.history-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e4ebeb;
  border-radius: 15px;
  background: #ffffff;
}

.history-empty {
  margin: 0;
  padding: 18px 14px;
  border: 1px dashed #dce6e9;
  border-radius: 15px;
  color: #839298;
  background: #fbfcfc;
  font-size: var(--font-size-caption);
  text-align: center;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  border-bottom: 1px solid #edf1f1;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: #f7fbfb;
}

.v-badge {
  display: flex;
  width: 38px;
  height: 26px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #087f7c;
  background: #eef9f8;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
}

.item-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.item-date {
  color: #20373f;
  font-family: var(--font-mono);
  font-size: var(--font-size-body-sm);
  font-weight: 700;
}

.item-period {
  overflow: hidden;
  color: #97a4a8;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 5px;
}

.return-text {
  color: #6a7b80;
  font-family: var(--font-mono);
  font-size: var(--font-size-body-sm);
  font-weight: 800;
}

.arrow-icon {
  color: #a3afb2;
}

.history-more {
  align-self: center;
  padding: 3px 4px;
}
</style>
