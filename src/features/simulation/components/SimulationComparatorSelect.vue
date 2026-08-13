<script setup>
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref } from 'vue'

import SimulationParticipantAvatar from '@/features/simulation/components/SimulationParticipantAvatar.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const emit = defineEmits(['confirm'])

const simulationStore = useSimulationStore()
const {
  actualParticipant,
  comparatorRoster: roster,
  botCompileProgress,
  isBotCompiling,
  isBotCompileComplete,
  isBotCompileFailed,
  selectedComparatorTypes: selectedComparators,
  selectedParticipantCount: selectedBotCount,
} = storeToRefs(simulationStore)
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

const displayedRules = computed(() =>
  (activeBot.value?.rules ?? [])
    .filter((rule) => !hiddenRuleLabels.has(rule.label))
    .slice(0, 4),
)

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

function handlePrimaryAction() {
  if (isBotCompileFailed.value) {
    void simulationStore.compilePersonalBot()
    return
  }

  if (isBotCompileComplete.value) {
    emit('confirm', selectedComparators.value)
  }
}
</script>

<template>
  <div class="challenger-select">
    <div class="challenger-intro">
      <div class="challenger-intro__eyebrow">
        <AppIcon name="trophy" :size="14" />
        <span>CHOOSE YOUR CHALLENGERS</span>
      </div>
      <h2>누구와 겨뤄볼까요?</h2>
      <p>최대 4명의 투자봇을 선택할 수 있어요.</p>
    </div>

    <section class="player-card" aria-label="고정 참가자">
      <div class="player-card__avatar">
        <SimulationParticipantAvatar variant-type="ACTUAL_USER" :size="44" />
      </div>
      <div class="player-card__info">
        <span>{{ actualParticipant?.className ?? 'PLAYER 01' }}</span>
        <strong>{{ actualParticipant?.variantName ?? '실제 나' }}</strong>
        <small>{{ actualParticipant?.description ?? '실제 매매 내역 그대로 참가' }}</small>
      </div>
      <span class="player-card__fixed">고정 참가</span>
    </section>

    <div class="versus-divider" aria-hidden="true">
      <i></i>
      <b>VS</b>
      <i></i>
    </div>

    <div class="roster-header">
      <strong>투자봇 로스터</strong>
      <span>{{ selectedBotCount }}명 선택 · 최대 4명</span>
    </div>

    <div class="roster-list">
      <article
        v-for="bot in roster"
        :key="bot.variantType"
        class="roster-card"
        :class="[`roster-card--${getBotTone(bot)}`, { 'is-selected': isSelected(bot) }]"
      >
        <button
          type="button"
          class="roster-card__details"
          :disabled="isPersonalBotUnavailable(bot)"
          @click="openBotModal(bot)"
        >
          <div class="roster-card__avatar">
            <SimulationParticipantAvatar :variant-type="bot.variantType" :size="48" />
            <span>{{ bot.level }}</span>
          </div>

          <div class="roster-card__content">
            <span class="roster-card__class">{{ bot.className }}</span>
            <span
              v-if="isPersonalBotLoading(bot)"
              class="roster-card__title-skeleton"
              aria-label="나의 투자봇 생성 중"
            ></span>
            <strong v-else-if="bot.variantType === 'PERSONAL_BOT' && isBotCompileFailed">
              투자봇 생성 실패
            </strong>
            <strong v-else>{{ bot.variantName }}</strong>
            <small>{{ bot.description }}</small>
            <div class="roster-card__traits">
              <span v-for="trait in bot.traits" :key="trait">{{ trait }}</span>
            </div>
            <span class="roster-card__detail">
              자세히 보기 <AppIcon name="chevron-right" :size="11" />
            </span>
          </div>
        </button>

        <button
          type="button"
          class="roster-card__select"
          :class="{ 'is-selected': isSelected(bot) }"
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
          <AppIcon
            v-if="isPersonalBotLoading(bot)"
            name="loader-circle"
            :size="16"
            class="roster-card__loader"
          />
          <AppIcon
            v-else-if="bot.variantType === 'PERSONAL_BOT' && isBotCompileFailed"
            name="triangle-alert"
            :size="16"
          />
          <AppIcon v-else :name="isSelected(bot) ? 'check' : 'plus'" :size="16" />
        </button>
      </article>
    </div>

    <div class="challenger-action">
      <BaseButton
        variant="primary"
        full-width
        :disabled="!isBotCompileComplete && !isBotCompileFailed"
        aria-live="polite"
        @click="handlePrimaryAction"
      >
        <template v-if="isBotCompileFailed">
          <AppIcon name="refresh-cw" :size="17" />
          <span>투자봇 다시 생성하기</span>
        </template>
        <template v-else-if="!isBotCompileComplete">
          <AppIcon name="loader-circle" :size="17" class="roster-card__loader" />
          <span>
            {{ `투자봇 생성 중 ${botCompileProgress}%` }}
          </span>
        </template>
        <template v-else>
          <span>{{ selectedBotCount }}명의 투자봇으로 계속</span>
          <AppIcon name="swords" :size="18" />
        </template>
      </BaseButton>
    </div>

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

        <header class="bot-modal__header">
          <div class="bot-modal__avatar">
            <SimulationParticipantAvatar :variant-type="activeBot.variantType" :size="54" />
          </div>
          <div class="bot-modal__identity">
            <span
              class="bot-modal__class"
              :class="`bot-modal__class--${getBotTone(activeBot)}`"
            >
              {{ botTypeLabel }}
            </span>
            <h3>{{ activeBot.variantName }}</h3>
            <p>{{ activeBot.description }}</p>
          </div>
        </header>

        <div class="bot-modal__summary">
          <AppIcon name="sparkles" :size="18" />
          <div>
            <span>한 줄 요약</span>
            <strong>{{ activeBot.summary }}</strong>
          </div>
        </div>

        <section v-if="activeBot.traits?.length" class="bot-modal__traits" aria-label="전략 특징">
          <span v-for="trait in activeBot.traits" :key="trait">{{ trait }}</span>
        </section>

        <section v-if="displayedPrinciples.length" class="bot-modal__section bot-modal__principles">
          <div class="bot-modal__section-title">
            <AppIcon name="compass" :size="17" />
            <strong>이렇게 투자해요</strong>
          </div>
          <ul>
            <li v-for="principle in displayedPrinciples" :key="principle.principleId ?? principle.text">
              <AppIcon name="check" :size="14" />
              <p>{{ principle.text ?? principle }}</p>
            </li>
          </ul>
        </section>

        <section v-if="displayedRules.length" class="bot-modal__section bot-modal__rules">
          <div class="bot-modal__section-title">
            <AppIcon name="sliders-horizontal" :size="17" />
            <strong>핵심 기준</strong>
          </div>
          <dl>
            <div v-for="rule in displayedRules" :key="rule.key ?? rule.label">
              <dt>{{ rule.label }}</dt>
              <dd>{{ rule.value }}</dd>
            </div>
          </dl>
        </section>

        <div v-if="activeBot.dataEvidence" class="bot-modal__data">
          <AppIcon name="database" :size="17" />
          <div>
            <strong>{{ activeBot.dataEvidence.title }}</strong>
            <span>{{ activeBot.dataEvidence.summary }}</span>
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
  min-height: 78px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #263a43;
  color: #fff;
}

.player-card__avatar {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 15px;
  background: rgb(255 255 255 / 12%);
}

.player-card__info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.player-card__info > span {
  color: #e8b931;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
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
  padding: 7px 9px;
  border-radius: 10px;
  background: rgb(255 255 255 / 10%);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.versus-divider {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 10px;
}

.versus-divider i {
  height: 1px;
  flex: 1;
  background: #dce6e9;
}

.versus-divider b {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #0b8f8b;
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
}

.roster-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.roster-header strong {
  color: #181817;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.roster-header span {
  padding: 6px 8px;
  border: 1px solid #dce6e9;
  border-radius: 10px;
  color: #384f59;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.roster-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.roster-card {
  display: flex;
  width: 100%;
  min-height: 112px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1.5px solid #dce6e9;
  border-radius: 16px;
  background: #fff;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.roster-card--personal.is-selected {
  border-color: #263a43;
}

.roster-card--legend.is-selected {
  border-color: #b78600;
}

.roster-card--random:not(.is-selected) {
  border-color: #e6e7e8;
  background: #fafafa;
  opacity: 0.72;
}

.roster-card__details {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.roster-card__details:disabled {
  cursor: wait;
}

.roster-card__avatar {
  display: flex;
  width: 60px;
  height: 72px;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 14px;
  background: #dce6e9;
}

.roster-card--legend .roster-card__avatar {
  background: #fff2bd;
}

.roster-card--random .roster-card__avatar {
  background: #f3ebfb;
}

.roster-card__avatar > span {
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.roster-card__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.roster-card__class {
  color: #263a43;
  font-family: var(--font-mono);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.roster-card--legend .roster-card__class {
  color: #805c00;
}

.roster-card--random .roster-card__class {
  color: #6d4d8f;
}

.roster-card__content > strong {
  color: #181817;
  font-size: var(--font-size-body);
  font-weight: 800;
}

.roster-card__title-skeleton {
  width: min(132px, 82%);
  height: 15px;
  border-radius: 5px;
  background: #dce6e9;
  animation: skeleton-pulse 1.15s ease-in-out infinite alternate;
}

.roster-card__content > small {
  overflow: hidden;
  color: #666662;
  font-size: var(--font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roster-card__traits {
  display: flex;
  gap: 5px;
}

.roster-card__traits span {
  padding: 4px 6px;
  border-radius: 6px;
  background: #edf1f2;
  color: #384f59;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.roster-card--legend .roster-card__traits span {
  background: #fff3ca;
  color: #805c00;
}

.roster-card--random .roster-card__traits span {
  background: #f3ebfb;
  color: #6d4d8f;
}

.roster-card__detail {
  display: inline-flex;
  align-items: center;
  color: #384f59;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.roster-card__select {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #dce6e9;
  border-radius: 50%;
  background: #fff;
  color: #94948e;
  cursor: pointer;
}

.roster-card.is-selected .roster-card__select {
  border-color: #263a43;
  background: #263a43;
  color: #fff;
}

.roster-card__select:disabled {
  cursor: default;
}

.roster-card__loader {
  animation: loader-spin 0.85s linear infinite;
}

.roster-card--legend.is-selected .roster-card__select {
  border-color: #9b6c00;
  background: #9b6c00;
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
  overflow-y: auto;
  border-radius: 26px 26px 0 0;
  background: #fbfcfc;
  box-shadow: 0 -18px 50px rgb(0 0 0 / 24%);
  text-align: left;
  scrollbar-width: none;
}

.bot-modal::-webkit-scrollbar {
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
  min-height: 78px;
  align-items: center;
  gap: 14px;
  padding-right: 42px;
}

.bot-modal__avatar {
  display: flex;
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: #e8f4f3;
}

.bot-modal--legend .bot-modal__avatar {
  background: #fff3cf;
}

.bot-modal--random .bot-modal__avatar {
  background: #f3ebfb;
}

.bot-modal__identity {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.bot-modal__class {
  padding: 5px 8px;
  border-radius: 999px;
  background: #edf1f2;
  color: #40545b;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.bot-modal__class--legend {
  background: #fff3ca;
  color: #805c00;
}

.bot-modal__class--random {
  background: #f3ebfb;
  color: #6d4d8f;
}

.bot-modal h3 {
  margin: 0;
  color: #181817;
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 800;
}

.bot-modal__identity p {
  margin: 0;
  color: #6f7e84;
  font-size: var(--font-size-caption);
  line-height: 1.45;
}

.bot-modal__summary {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  background: #eef8f7;
  color: #087f7c;
}

.bot-modal__summary > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bot-modal__summary span {
  color: #087f7c;
  font-size: 11px;
  font-weight: 800;
}

.bot-modal__summary strong {
  color: #263a43;
  font-size: 14px;
  line-height: 1.5;
}

.bot-modal__traits {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.bot-modal__traits span {
  padding: 7px 10px;
  border: 1px solid #dce6e8;
  border-radius: 999px;
  background: #fff;
  color: #40545b;
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.bot-modal__section {
  overflow: hidden;
  border: 1px solid #e1e7e9;
  border-radius: 16px;
  background: #fff;
}

.bot-modal__section-title {
  display: flex;
  min-height: 41px;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid #edf1f2;
}

.bot-modal__section-title strong {
  color: #263a43;
  font-size: 14px;
  font-weight: 800;
}

.bot-modal__principles ul {
  display: flex;
  margin: 0;
  padding: 10px 14px 12px;
  flex-direction: column;
  gap: 4px;
  list-style: none;
}

.bot-modal__principles li {
  display: flex;
  min-height: 31px;
  align-items: flex-start;
  gap: 9px;
}

.bot-modal__principles li > svg {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-top: 1px;
  padding: 3px;
  border-radius: 50%;
  background: #e7f5f3;
  color: #087f7c;
}

.bot-modal__principles p {
  margin: 0;
  color: #263a43;
  font-size: 13px;
  line-height: 1.5;
}

.bot-modal__rules dl {
  margin: 0;
}

.bot-modal__rules dl > div {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 14px;
  border-bottom: 1px solid #edf1f2;
}

.bot-modal__rules dl > div:last-child {
  border-bottom: 0;
}

.bot-modal__rules dt {
  color: #718188;
  font-size: var(--font-size-caption);
}

.bot-modal__rules dd {
  margin: 0;
  color: #263a43;
  font-size: 13px;
  font-weight: 800;
  text-align: right;
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
