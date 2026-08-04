<script setup>
import { computed } from 'vue'

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
})

const emit = defineEmits(['start'])
const participantCount = computed(() => 2 + props.selectedBotTypes.length)

function formatCurrency(val) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val)
}
</script>

<template>
  <div class="condition-setup-container">
    <!-- Header -->
    <div class="setup-header">
      <div class="setup-header__top">
        <h2 class="setup-header__title">자동 구성 참가자와 시작점을 확인해요</h2>
        <span class="step-pill">2 / 2</span>
      </div>
      <p class="setup-header__description">
        최신 원칙 봇과 선택한 비교 봇이 동시 백테스트에 참전해요.
      </p>
    </div>

    <!-- Participants Summary Card -->
    <div class="participants-box">
      <div class="box-header">
        <span class="box-tag">PARTICIPANTS · {{ participantCount }}</span>
        <span class="status-tag">구성 완료</span>
      </div>

      <div class="participants-chips">
        <div class="p-chip">
          <AppIcon name="user" :size="12" />
          <span>실제 나</span>
        </div>
        <div class="p-chip highlight">
          <AppIcon name="sparkles" :size="12" />
          <span>나의 최신 원칙 봇</span>
        </div>
        <div v-if="selectedBotTypes.includes('FAMOUS_STRATEGY')" class="p-chip blue">
          <AppIcon name="landmark" :size="12" />
          <span>가치·품질 봇</span>
        </div>
        <div v-if="selectedBotTypes.includes('RANDOM_BOT')" class="p-chip orange">
          <span>원숭이 랜덤 봇</span>
        </div>
      </div>
    </div>

    <!-- Period & Capital Settings -->
    <div class="settings-card">
      <h3 class="settings-card__title">시뮬레이션 가동 조건</h3>

      <div class="setting-item">
        <div class="setting-item__icon-box">
          <AppIcon name="calendar-range" :size="18" />
        </div>
        <div class="setting-item__content">
          <span class="setting-label">백테스트 대상 기간</span>
          <span class="setting-value">{{ periodStart }} ~ {{ periodEnd }} ({{ totalDays }}일)</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-item__icon-box blue-bg">
          <AppIcon name="database" :size="18" />
        </div>
        <div class="setting-item__content">
          <span class="setting-label">시작 자본금 (추천치)</span>
          <span class="setting-value primary-color">{{ formatCurrency(initialCapital) }}</span>
        </div>
      </div>
    </div>

    <!-- Action Footer -->
    <div class="action-footer">
      <BaseButton variant="primary" full-width @click="emit('start')">
        <AppIcon name="play" :size="18" />
        <span>백테스트 연산 실행하기</span>
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.condition-setup-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.setup-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setup-header__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.setup-header__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #263a43;
  line-height: 1.3;
}

.step-pill {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: #263a43;
  padding: 4px 10px;
  border-radius: 14px;
  flex-shrink: 0;
}

.setup-header__description {
  margin: 0;
  font-size: 12px;
  color: #66777d;
}

.participants-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #f5fbfb;
  border: 1px solid #cdedea;
  border-radius: 14px;
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.box-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #263a43;
}

.status-tag {
  font-size: 10px;
  font-weight: 700;
  color: #087f7c;
}

.participants-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.p-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #263a43;
}

.p-chip.highlight {
  border-color: #0b8f8b;
  color: #087f7c;
  background: #e8f7f6;
}

.p-chip.blue {
  border-color: #0b63ce;
  color: #0b63ce;
  background: #edf5ff;
}

.p-chip.orange {
  border-color: #f59e0b;
  color: #d97706;
  background: #fffbeb;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 16px;
}

.settings-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #263a43;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border-radius: 12px;
}

.setting-item__icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e8f7f6;
  color: #087f7c;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.setting-item__icon-box.blue-bg {
  background: #edf5ff;
  color: #0b63ce;
}

.setting-item__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.setting-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.primary-color {
  color: var(--brand-teal-deep);
}

.action-footer {
  width: 100%;
  margin-top: 8px;
}
</style>
