<script setup>
import { computed, ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import MonkeyImage from '@/shared/components/MonkeyImage.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const emit = defineEmits(['back', 'confirm'])

// Selection state for comparator bots
const selectedComparators = ref(['FAMOUS_STRATEGY']) // default selected Quant bot

const availableComparators = [
  {
    type: 'FAMOUS_STRATEGY',
    name: '가치·품질 봇',
    tag: 'LEGEND',
    tagColor: '#0B63CE',
    description: '가치와 품질을 오래 추적하는 기준 전략',
    icon: 'landmark',
  },
  {
    type: 'RANDOM_BOT',
    name: '원숭이 랜덤 봇',
    tag: 'RANDOM',
    tagColor: '#66777D',
    description: '무작위 선택과 비교하는 기준선',
    isMonkey: true,
  },
]

const totalParticipantsCount = computed(() => 2 + selectedComparators.value.length)

function toggleSelect(type) {
  const idx = selectedComparators.value.indexOf(type)
  if (idx > -1) {
    selectedComparators.value.splice(idx, 1)
  } else {
    if (selectedComparators.value.length < 2) {
      selectedComparators.value.push(type)
    }
  }
}
</script>

<template>
  <div class="comparator-select-container">
    <!-- Header Title -->
    <div class="select-header">
      <div class="select-header__title-row">
        <h2 class="select-header__title">누구와 비교해볼까요?</h2>
        <span class="step-pill">1 / 2</span>
      </div>
      <p class="select-header__description">
        실제 나와 최신 원칙 봇은 자동으로 참가해요.<br />
        비교 기준 봇은 최대 2명까지 더할 수 있어요.
      </p>
    </div>

    <!-- Fixed Participants Section -->
    <div class="fixed-participants-box">
      <div class="box-header">
        <span class="box-title">자동 참가 · 2명</span>
        <span class="box-sub">변경할 수 없어요</span>
      </div>

      <div class="fixed-cards-grid">
        <!-- Fixed 1: Actual User -->
        <div class="fixed-card">
          <div class="fixed-card__top">
            <div class="icon-circle gray">
              <AppIcon name="user" :size="14" />
            </div>
            <AppIcon name="lock-keyhole" :size="13" class="lock-icon" />
          </div>
          <span class="card-name">실제 나</span>
          <span class="card-desc">실제 거래 데이터</span>
        </div>

        <!-- Fixed 2: Personal Bot -->
        <div class="fixed-card highlight">
          <div class="fixed-card__top">
            <div class="icon-circle teal">
              <AppIcon name="sparkles" :size="14" />
            </div>
            <AppIcon name="lock-keyhole" :size="13" class="lock-icon teal-lock" />
          </div>
          <span class="card-name teal-text">최신 원칙 봇</span>
          <span class="card-desc teal-desc">내가 정한 최신 원칙</span>
        </div>
      </div>
    </div>

    <!-- Comparator Selection Section -->
    <div class="comparators-section">
      <div class="section-header">
        <h3 class="section-title">비교 기준 봇</h3>
        <span class="selection-count">{{ selectedComparators.length }}명 선택 · 최대 2명</span>
      </div>

      <div class="comparators-list">
        <button
          v-for="bot in availableComparators"
          :key="bot.type"
          type="button"
          class="comparator-card"
          :class="{ selected: selectedComparators.includes(bot.type) }"
          :aria-pressed="selectedComparators.includes(bot.type)"
          @click="toggleSelect(bot.type)"
        >
          <div class="comparator-card__icon">
            <MonkeyImage v-if="bot.isMonkey" mood="happy" :size="36" />
            <div v-else class="legend-icon-box">
              <AppIcon :name="bot.icon" :size="20" />
            </div>
          </div>

          <div class="comparator-card__info">
            <div class="name-row">
              <span class="bot-name">{{ bot.name }}</span>
              <span class="tag-badge" :style="{ color: bot.tagColor }">{{ bot.tag }}</span>
            </div>
            <span class="bot-desc">{{ bot.description }}</span>
          </div>

          <span class="check-btn" :class="{ active: selectedComparators.includes(bot.type) }">
            <AppIcon :name="selectedComparators.includes(bot.type) ? 'check' : 'plus'" :size="16" />
          </span>
        </button>
      </div>
    </div>

    <!-- Bottom Info Banner -->
    <div class="info-footer">
      <span class="info-text">모든 참가자는 같은 시작일과 초기 자금으로 비교해요.</span>
    </div>

    <!-- Action Button -->
    <div class="action-footer">
      <BaseButton variant="primary" full-width @click="emit('confirm', selectedComparators)">
        <span>{{ totalParticipantsCount }}명으로 시작 조건 설정하기</span>
        <AppIcon name="arrow-right" :size="18" />
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.comparator-select-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.select-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.select-header__title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.select-header__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #263a43;
}

.step-pill {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: #263a43;
  padding: 4px 10px;
  border-radius: 14px;
}

.select-header__description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #66777d;
}

.fixed-participants-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: #f5fbfb;
  border: 1px solid #cdedea;
  border-radius: 14px;
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.box-title {
  font-size: 12px;
  font-weight: 700;
  color: #263a43;
}

.box-sub {
  font-size: 10px;
  font-weight: 600;
  color: #087f7c;
}

.fixed-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fixed-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 11px;
}

.fixed-card.highlight {
  border-color: #0b8f8b;
}

.fixed-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
}

.icon-circle.gray {
  background: #f0f4f5;
  color: #384f59;
}

.icon-circle.teal {
  background: #e8f7f6;
  color: #087f7c;
}

.lock-icon {
  color: #66777d;
}

.teal-lock {
  color: #087f7c;
}

.card-name {
  font-size: 12px;
  font-weight: 700;
  color: #263a43;
}

.teal-text {
  color: #087f7c;
}

.card-desc {
  font-size: 9px;
  color: #66777d;
}

.teal-desc {
  color: #087f7c;
}

.comparators-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #263a43;
}

.selection-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #087f7c;
}

.comparators-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comparator-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1.5px solid #dce6e9;
  border-radius: 14px;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comparator-card.selected {
  border-color: #0b8f8b;
  background: #ffffff;
}

.comparator-card:focus-visible {
  outline: 3px solid rgba(11, 143, 139, 0.2);
  outline-offset: 2px;
}

.comparator-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.legend-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #edf5ff;
  color: #0b63ce;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comparator-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bot-name {
  font-size: 13px;
  font-weight: 700;
  color: #263a43;
}

.tag-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 700;
}

.bot-desc {
  font-size: 11px;
  color: #66777d;
}

.check-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: none;
  background: #f0f4f5;
  color: #66777d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.check-btn.active {
  background: #0b8f8b;
  color: #ffffff;
}

.info-footer {
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 12px;
  text-align: center;
}

.info-text {
  font-size: 11px;
  font-weight: 600;
  color: #66777d;
}

.action-footer {
  width: 100%;
  margin-top: 4px;
}
</style>
