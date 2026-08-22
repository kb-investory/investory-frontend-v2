<script setup>
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'

import SimulationCharacterPortrait from '@/features/simulation/components/SimulationCharacterPortrait.vue'
import SimulationConditionSetup from '@/features/simulation/components/SimulationConditionSetup.vue'
import SimulationStepHeading from '@/features/simulation/components/SimulationStepHeading.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  periodStart: {
    type: String,
    default: '',
  },
  periodEnd: {
    type: String,
    default: '',
  },
  accountId: {
    type: Number,
    default: null,
  },
  isPending: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start'])

const simulationStore = useSimulationStore()
const {
  actualParticipant,
  comparatorRoster: roster,
  isBotCompiling,
  isBotCompileComplete,
  isBotCompileFailed,
  selectedComparatorTypes: selectedComparators,
  selectedParticipantCount: selectedBotCount,
} = storeToRefs(simulationStore)
const conditionPanel = ref(null)

/**
 * 로스터를 다 채우면 다음 할 일(기간 설정)이 화면 위로 오도록 스크롤한다.
 * 진입 시점에 이미 가득 차 있으므로, 사용자가 직접 채워 넣어 늘어난 순간에만 움직인다.
 */
watch(selectedBotCount, (count, previous) => {
  if (count <= previous) return
  if (count < roster.value.length) return
  void nextTick(scrollToPeriodStep)
})

function scrollToPeriodStep() {
  const panelRoot = conditionPanel.value?.$el
  const target = panelRoot?.querySelector('.period-card')
  // 스크롤되는 건 문서가 아니라 모바일 프레임의 본문 영역이다.
  const scroller = panelRoot?.closest('.mobile-main')
  if (!target || !scroller) return

  const offset = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  scroller.scrollTo({
    top: scroller.scrollTop + offset - 12,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}

const activeBot = ref(null)
const botModal = ref(null)

const botTypeLabel = computed(
  () =>
    ({
      PERSONAL_BOT: '내 원칙 기반',
      FAMOUS_STRATEGY: '가치·품질 전략',
      RANDOM_BOT: '성과 비교 기준',
    })[activeBot.value?.variantType] ?? '투자 전략',
)

const displayedPrinciples = computed(() => (activeBot.value?.principles ?? []).slice(0, 3))

const hiddenRuleLabels = new Set([
  '반복 실행',
  '화면 재현 시드',
  '일별 매매 시도 확률',
  '보유 시 매도 선택 확률',
])

const ruleIconByLabel = {
  '종목 선택': 'target',
  포트폴리오: 'chart-pie',
  매도: 'log-out',
  매수: 'shield-check',
}

function getRuleIcon(rule) {
  return ruleIconByLabel[rule?.label] ?? 'sliders-horizontal'
}

const displayedRules = computed(() =>
  (activeBot.value?.rules ?? []).filter((rule) => !hiddenRuleLabels.has(rule.label)).slice(0, 4),
)

/**
 * className/level은 백엔드(/simulation/bots/comparators)가 내려주는 값이라
 * 화면에서만 한국어로 바꾼다. 모르는 값은 그대로 통과시켜 데이터가 바뀌어도 깨지지 않게 한다.
 */
const CLASS_LABEL_KO = {
  'PLAYER 01': '실제 참가자',
  PLAYER: '실제 참가자',
  PERSONAL: '내 원칙',
  LEGEND: '가치 투자',
  'WILD CARD': '무작위',
  WILD: '무작위',
}

function toClassLabel(value) {
  if (!value) return ''
  return CLASS_LABEL_KO[value] ?? value
}

function getBotTone(bot) {
  return (
    {
      PERSONAL_BOT: 'personal',
      FAMOUS_STRATEGY: 'legend',
      RANDOM_BOT: 'random',
    }[bot?.variantType] ?? 'personal'
  )
}

function isSelected(bot) {
  return bot.fixed || selectedComparators.value.includes(bot.variantType)
}

function openBotModal(bot) {
  if (isPersonalBotLoading(bot)) return
  activeBot.value = bot
  void nextTick(() => botModal.value?.focus())
}

function isPersonalBotLoading(bot) {
  return bot?.variantType === 'PERSONAL_BOT' && isBotCompiling.value
}

function isPersonalBotUnavailable(bot) {
  return bot?.variantType === 'PERSONAL_BOT' && !isBotCompileComplete.value
}

function toggleBotSelection(bot) {
  simulationStore.toggleComparator(bot?.variantType)
}

function handleModalAction() {
  if (!activeBot.value || activeBot.value.fixed) return
  toggleBotSelection(activeBot.value)
}
</script>

<template>
  <div class="challenger-select">
    <div class="challenger-intro">
      <div class="challenger-intro__eyebrow">
        <AppIcon name="trophy" :size="14" />
        <span>함께 겨룰 상대 고르기</span>
      </div>
      <h2>누구와 겨뤄볼까요?</h2>
      <p>실제 나와 함께 달릴 투자봇을 최대 {{ roster.length }}개까지 고를 수 있어요.</p>
    </div>

    <SimulationStepHeading step="01" title="시뮬레이션 로스터 선택">
      <template #meta>{{ selectedBotCount + 1 }} / {{ roster.length + 1 }}</template>
    </SimulationStepHeading>

    <div class="roster-panel">
      <section class="player-card" aria-label="고정 참가자">
        <div class="player-card__portrait">
          <SimulationCharacterPortrait variant-type="ACTUAL_USER" />
        </div>
        <div class="player-card__info">
          <span class="player-card__meta">
            <span class="player-card__class">
              {{ toClassLabel(actualParticipant?.className) || '실제 참가자' }}
            </span>
            <span class="player-card__fixed">고정 참가</span>
          </span>
          <strong>{{ actualParticipant?.variantName ?? '실제 나' }}</strong>
          <small>{{ actualParticipant?.description ?? '실제 매매 내역 그대로 참가' }}</small>
        </div>
      </section>

      <div class="versus-badge" aria-hidden="true">VS</div>

      <div class="roster-grid">
        <article
          v-for="bot in roster"
          :key="bot.variantType"
          class="pick-card"
          :class="[`pick-card--${getBotTone(bot)}`, { 'is-selected': isSelected(bot) }]"
        >
          <button
            type="button"
            class="pick-card__stage"
            :aria-label="
              bot.fixed
                ? `${bot.variantName} 고정 참가`
                : isSelected(bot)
                  ? `${bot.variantName} 선택 해제`
                  : `${bot.variantName} 선택`
            "
            :aria-pressed="isSelected(bot)"
            :disabled="bot.fixed || isPersonalBotUnavailable(bot)"
            @click="toggleBotSelection(bot)"
          >
            <span class="pick-card__level">{{ bot.level }}</span>

            <span class="pick-card__portrait">
              <SimulationCharacterPortrait :variant-type="bot.variantType" />
            </span>

            <span class="pick-card__marker" aria-hidden="true">
              <AppIcon
                v-if="isPersonalBotLoading(bot)"
                name="loader-circle"
                :size="14"
                class="roster-card__loader"
              />
              <AppIcon
                v-else-if="bot.variantType === 'PERSONAL_BOT' && isBotCompileFailed"
                name="triangle-alert"
                :size="14"
              />
              <AppIcon v-else-if="isSelected(bot)" name="check" :size="14" />
            </span>

            <span class="pick-card__name">
              <span
                v-if="isPersonalBotLoading(bot)"
                class="roster-card__title-skeleton"
                aria-label="나의 투자봇 생성 중"
              ></span>
              <strong v-else-if="bot.variantType === 'PERSONAL_BOT' && isBotCompileFailed">
                생성 실패
              </strong>
              <strong v-else>{{ bot.variantName }}</strong>
              <small>{{ toClassLabel(bot.className) }}</small>
            </span>
          </button>

          <button
            type="button"
            class="pick-card__info"
            :aria-label="`${bot.variantName} 자세히 보기`"
            :disabled="isPersonalBotUnavailable(bot)"
            @click="openBotModal(bot)"
          >
            <AppIcon name="info" :size="13" />
            <span>상세보기</span>
          </button>
        </article>
      </div>
    </div>

    <div class="step-divider" role="separator"></div>

    <SimulationConditionSetup
      v-if="periodStart && periodEnd"
      ref="conditionPanel"
      :period-start="periodStart"
      :period-end="periodEnd"
      :account-id="accountId"
      :is-pending="isPending"
      @start="emit('start', $event)"
    />

    <div
      v-if="activeBot"
      class="bot-modal-overlay"
      role="presentation"
      @click.self="activeBot = null"
    >
      <section
        ref="botModal"
        class="bot-modal"
        :class="`bot-modal--${getBotTone(activeBot)}`"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-label="`${activeBot.variantName} 상세 정보`"
        @keydown.esc="activeBot = null"
      >
        <span class="bot-modal__handle" aria-hidden="true"></span>

        <button type="button" class="bot-modal__close" aria-label="닫기" @click="activeBot = null">
          <AppIcon name="x" :size="18" />
        </button>

        <div class="bot-modal__content">
          <header class="bot-modal__header">
            <div class="bot-modal__portrait">
              <SimulationCharacterPortrait :variant-type="activeBot.variantType" />
            </div>
            <div class="bot-modal__identity">
              <span class="bot-modal__class" :class="`bot-modal__class--${getBotTone(activeBot)}`">
                {{ botTypeLabel }}
              </span>
              <h3>{{ activeBot.variantName }}</h3>
              <div v-if="activeBot.traits?.length" class="bot-modal__traits" aria-label="전략 특징">
                <span v-for="trait in activeBot.traits" :key="trait">{{ trait }}</span>
              </div>
            </div>
          </header>

          <p class="bot-modal__summary">{{ activeBot.summary }}</p>

          <section v-if="displayedRules.length" class="bot-modal__section bot-modal__rules">
            <div class="bot-modal__section-title">
              <AppIcon name="sliders-horizontal" :size="16" />
              <strong>이렇게 움직여요</strong>
            </div>
            <dl>
              <div v-for="rule in displayedRules" :key="rule.key ?? rule.label">
                <dt>
                  <AppIcon :name="getRuleIcon(rule)" :size="15" />
                  <span>{{ rule.label }}</span>
                </dt>
                <dd>{{ rule.value }}</dd>
              </div>
            </dl>
          </section>

          <section
            v-if="displayedPrinciples.length"
            class="bot-modal__section bot-modal__principles"
          >
            <div class="bot-modal__section-title">
              <AppIcon name="compass" :size="16" />
              <strong>지키는 원칙</strong>
            </div>
            <ol>
              <li
                v-for="(principle, idx) in displayedPrinciples"
                :key="principle.principleId ?? principle.text ?? idx"
              >
                <span class="bot-modal__step">{{ idx + 1 }}</span>
                <p>{{ principle.text ?? principle }}</p>
              </li>
            </ol>
          </section>

          <div v-if="activeBot.dataEvidence" class="bot-modal__data">
            <AppIcon name="database" :size="17" />
            <div>
              <strong>{{ activeBot.dataEvidence.title }}</strong>
              <span>{{ activeBot.dataEvidence.summary }}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="bot-modal__select-button"
          :class="{ 'is-selected': isSelected(activeBot) }"
          :disabled="activeBot.fixed"
          @click="handleModalAction"
        >
          <AppIcon :name="isSelected(activeBot) ? 'circle-check' : 'plus'" :size="17" />
          <span>
            {{
              activeBot.fixed
                ? '기본 참가 봇'
                : isSelected(activeBot)
                  ? '선택 해제하기'
                  : '이 봇 선택하기'
            }}
          </span>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.challenger-select {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 76px;
}

.challenger-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.challenger-intro__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #087f7c;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.challenger-intro h2 {
  margin: 0;
  color: #181817;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-md);
  font-weight: 800;
  letter-spacing: -0.6px;
}

.challenger-intro p {
  margin: 0;
  color: #94948e;
  font-size: var(--font-size-caption);
}

.player-card {
  display: flex;
  min-height: 116px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  color: #fff;
  background: #263a43;
}

/* 어두운 카드라 pick-card의 어두운 발밑 그림자는 보이지 않는다.
   PLAYER 01 라벨과 같은 금색 계열 스포트라이트로 바닥선을 만든다. */
.player-card__portrait {
  --portrait-baseline: 7%;

  position: relative;
  overflow: hidden;
  width: 78px;
  height: 100px;
  flex: 0 0 auto;
  border-radius: 14px;
  background:
    radial-gradient(ellipse 60% 18% at 50% 92%, rgb(232 185 49 / 30%) 0%, transparent 70%),
    rgb(255 255 255 / 8%);
}

.player-card__info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.player-card__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.player-card__class {
  overflow: hidden;
  color: #e8b931;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-card__info strong {
  font-size: var(--font-size-body);
  font-weight: 800;
}

.player-card__info small {
  overflow: hidden;
  color: #c9d6da;
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-card__fixed {
  flex: 0 0 auto;
  padding: 3px 7px;
  border-radius: 8px;
  background: rgb(255 255 255 / 12%);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

/* 01 단계가 실제 나 카드와 로스터로 쪼개져 보이지 않도록 하나의 판 안에 묶는다. */
.step-divider {
  height: 1px;
  margin: 4px 2px 2px;
  border: 0;
  background: linear-gradient(90deg, transparent 0%, #dde6e8 18%, #dde6e8 82%, transparent 100%);
}

.roster-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e2eaec;
  border-radius: 20px;
  background: #f7fafb;
}

/* 가로줄로 나누면 두 덩어리로 읽혀서, 경계를 걸치는 배지로 두 영역을 잇는다. */
.versus-badge {
  position: relative;
  z-index: 2;
  display: grid;
  width: 30px;
  height: 30px;
  align-self: center;
  margin: -16px 0;
  place-items: center;
  border: 3px solid #f7fafb;
  border-radius: 50%;
  color: #ffffff;
  background: #0b8f8b;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 800;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pick-card {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid #dbe5e8;
  border-radius: 16px;
  background: linear-gradient(180deg, #f6fafb 0%, #e6eef1 100%);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.pick-card.is-selected {
  border-color: #087f7c;
  box-shadow: 0 6px 18px rgb(8 127 124 / 22%);
  transform: translateY(-2px);
}

.pick-card--legend.is-selected {
  border-color: #9b6c00;
  box-shadow: 0 6px 18px rgb(155 108 0 / 22%);
}

.pick-card--random.is-selected {
  border-color: #a9662f;
  box-shadow: 0 6px 18px rgb(169 102 47 / 22%);
}

.pick-card__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.pick-card__stage:disabled {
  cursor: default;
  opacity: 0.55;
}

.pick-card__level {
  position: absolute;
  z-index: 2;
  top: 6px;
  left: 6px;
  padding: 2px 5px;
  border-radius: 6px;
  color: #ffffff;
  background: rgb(38 58 67 / 78%);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.pick-card__marker {
  position: absolute;
  z-index: 2;
  top: 6px;
  right: 6px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid #cfdde1;
  border-radius: 50%;
  color: #ffffff;
  background: #ffffff;
}

.pick-card.is-selected .pick-card__marker {
  border-color: #087f7c;
  background: #087f7c;
}

.pick-card--legend.is-selected .pick-card__marker {
  border-color: #9b6c00;
  background: #9b6c00;
}

.pick-card--random.is-selected .pick-card__marker {
  border-color: #a9662f;
  background: #a9662f;
}

/* 캐릭터가 서 있는 무대. 발밑 그림자로 바닥선을 만들어 3종의 키를 같아 보이게 한다. */
.pick-card__portrait {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;

  --portrait-baseline: 8%;
}

.pick-card__portrait::after {
  position: absolute;
  right: 16%;
  bottom: 6%;
  left: 16%;
  height: 7px;
  border-radius: 50%;
  background: rgb(30 60 70 / 16%);
  content: '';
  filter: blur(2.5px);
}

.pick-card__name {
  display: flex;
  width: 100%;
  min-height: 40px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0 4px 6px;
}

.pick-card__name strong {
  overflow: hidden;
  max-width: 100%;
  color: #20373f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-card__name small {
  overflow: hidden;
  max-width: 100%;
  color: #7c8b90;
  font-size: 9px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick-card__info {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  gap: 3px;
  padding: 8px 4px;
  border: 0;
  border-top: 1px solid rgb(30 60 70 / 8%);
  color: #5d7379;
  background: rgb(255 255 255 / 55%);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.pick-card__info:disabled {
  cursor: default;
  opacity: 0.45;
}

.roster-card__title-skeleton {
  width: 68%;
  height: 12px;
  border-radius: 5px;
  background: #dce6e9;
  animation: skeleton-pulse 1.15s ease-in-out infinite alternate;
}

.roster-card__loader {
  animation: loader-spin 0.85s linear infinite;
}
.challenger-action {
  position: fixed;
  z-index: 30;
  bottom: 16px;
  left: 50%;
  width: min(calc(100% - 40px), 350px);
  transform: translateX(-50%);
}

.bot-modal-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px 8px 0;
  background: rgb(20 34 39 / 52%);
  backdrop-filter: blur(4px);
}

.bot-modal {
  position: relative;
  display: flex;
  width: min(100%, 390px);
  max-height: min(88dvh, 720px);
  flex-direction: column;
  gap: 14px;
  padding: 26px 20px max(20px, env(safe-area-inset-bottom));
  overflow: hidden;
  border-radius: 26px 26px 0 0;
  background: #fbfcfc;
  box-shadow: 0 -18px 50px rgb(0 0 0 / 24%);
  text-align: left;
  scrollbar-width: none;
}

.bot-modal__content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.bot-modal__content > * {
  flex: 0 0 auto;
}

.bot-modal__content::-webkit-scrollbar {
  display: none;
}

.bot-modal__handle {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 56px;
  height: 4px;
  border-radius: 999px;
  background: #dce4e6;
  transform: translateX(-50%);
}

.bot-modal__close {
  position: absolute;
  z-index: 1;
  top: 24px;
  right: 20px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #f7fafb;
  color: #40545b;
  cursor: pointer;
}

.bot-modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 선택 화면과 같은 캐릭터를 써서 어떤 봇을 보고 있는지 즉시 알아보게 한다. */
.bot-modal__portrait {
  --portrait-baseline: 8%;

  position: relative;
  overflow: hidden;
  width: 84px;
  height: 96px;
  flex: 0 0 auto;
  border-radius: 16px;
  background:
    radial-gradient(ellipse 58% 16% at 50% 91%, rgb(8 127 124 / 22%) 0%, transparent 70%),
    linear-gradient(180deg, #f4f9fa 0%, #e6eef1 100%);
}

.bot-modal--legend .bot-modal__portrait {
  background:
    radial-gradient(ellipse 58% 16% at 50% 91%, rgb(155 108 0 / 22%) 0%, transparent 70%),
    linear-gradient(180deg, #fdf8ec 0%, #f3e9d3 100%);
}

.bot-modal--random .bot-modal__portrait {
  background:
    radial-gradient(ellipse 58% 16% at 50% 91%, rgb(169 102 47 / 22%) 0%, transparent 70%),
    linear-gradient(180deg, #fdf6ef 0%, #f3e6d8 100%);
}

.bot-modal__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.bot-modal__class {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  color: #087f7c;
  background: #e8f7f6;
  font-size: 10px;
  font-weight: 800;
}

.bot-modal__class--legend {
  color: #8a6000;
  background: #f8eed6;
}

.bot-modal__class--random {
  color: #a9662f;
  background: #f8e9db;
}

.bot-modal h3 {
  margin: 0;
  color: #20373f;
  font-size: var(--font-size-title-md);
  font-weight: 850;
  letter-spacing: -0.03em;
}

.bot-modal__traits {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.bot-modal__traits span {
  padding: 2px 7px;
  border: 1px solid #dce6e9;
  border-radius: 999px;
  color: #5d7379;
  background: #ffffff;
  font-size: 10px;
  font-weight: 700;
}

/* description과 중복되던 자리. 한 문장 요약만 남겨 인용문처럼 보여준다. */
.bot-modal__summary {
  margin: 0;
  padding: 12px 14px;
  border-left: 3px solid #a9dfdc;
  border-radius: 0 12px 12px 0;
  color: #3f565e;
  background: #f4fafa;
  font-size: var(--font-size-body-sm, 13px);
  line-height: 1.6;
  word-break: keep-all;
}

.bot-modal--legend .bot-modal__summary {
  border-left-color: #e0c47a;
  background: #fdf9f0;
}

.bot-modal--random .bot-modal__summary {
  border-left-color: #e8bd93;
  background: #fdf7f1;
}

.bot-modal__section {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.bot-modal__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #087f7c;
}

.bot-modal__section-title strong {
  color: #20373f;
  font-size: var(--font-size-body-sm, 13px);
  font-weight: 800;
}

/* 봇마다 값을 나란히 비교하는 곳이라 라벨/값을 좌우로 붙여 스펙표처럼 읽히게 한다. */
.bot-modal__rules dl {
  display: flex;
  margin: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e4ebec;
  border-radius: 13px;
  background: #ffffff;
}

.bot-modal__rules dl > div {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid #eef3f4;
}

.bot-modal__rules dl > div:last-child {
  border-bottom: none;
}

.bot-modal__rules dt {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: #6d7f85;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.bot-modal__rules dt > svg {
  color: #9fb3b8;
}

.bot-modal__rules dd {
  margin: 0;
  color: #20373f;
  font-size: 13px;
  font-weight: 800;
  text-align: right;
  word-break: keep-all;
}

.bot-modal__principles ol {
  display: flex;
  margin: 0;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.bot-modal__principles li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.bot-modal__step {
  display: grid;
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  place-items: center;
  margin-top: 1px;
  border-radius: 50%;
  color: #087f7c;
  background: #e8f7f6;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 800;
}

.bot-modal--legend .bot-modal__step {
  color: #8a6000;
  background: #f8eed6;
}

.bot-modal--random .bot-modal__step {
  color: #a9662f;
  background: #f8e9db;
}

.bot-modal__principles p {
  margin: 0;
  color: #45595f;
  font-size: 12.5px;
  line-height: 1.55;
  word-break: keep-all;
}
.bot-modal__data {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #e1e8ea;
  border-radius: 14px;
  background: #fff;
  color: #087f7c;
}

.bot-modal__data > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bot-modal__data strong {
  color: #263a43;
  font-size: var(--font-size-caption);
}

.bot-modal__data span {
  color: #78888e;
  font-size: var(--font-size-caption);
}

.bot-modal__select-button {
  display: inline-flex;
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 15px;
  background: #263a43;
  color: #fff;
  font-family: inherit;
  font-size: var(--font-size-body);
  font-weight: 800;
  flex: 0 0 auto;
}

.bot-modal__select-button.is-selected {
  color: #75d6d2;
}

.bot-modal__select-button:disabled {
  background: #e9eff0;
  color: #65777e;
  cursor: default;
}

@keyframes loader-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes skeleton-pulse {
  to {
    background: #f0f4f5;
  }
}
</style>
