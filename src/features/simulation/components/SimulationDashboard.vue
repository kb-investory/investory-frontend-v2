<script setup>
import { ref } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

defineProps({
  overview: {
    type: Object,
    default: null,
  },
  latestResult: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['startSimulation', 'selectRecord'])
const showHelpModal = ref(false)

const historyRecords = [
  { version: 'v3', date: '2026.07.27', period: '2025.03.10 — 2026.07.27', returnPercent: 15.7 },
  { version: 'v2', date: '2026.06.18', period: '2025.03.10 — 2026.06.17', returnPercent: 11.4 },
  { version: 'v2', date: '2026.05.02', period: '2025.03.10 — 2026.05.01', returnPercent: 9.8 },
  { version: 'v1', date: '2026.03.21', period: '2025.03.10 — 2026.03.20', returnPercent: 6.2 },
]

function formatPercent(val) {
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(1)}%`
}
</script>

<template>
  <div class="dashboard-page-container">
    <!-- Header Subtitle -->
    <div class="page-subtitle">
      나의 선택을 과거 시장에서 다시 확인해요.
    </div>

    <!-- Hero Card: 같은 날, 같은 돈으로 다시 투자해 본다면? -->
    <div class="hero-card">
      <!-- Help Icon (top right) -->
      <button class="help-btn" type="button" @click="showHelpModal = !showHelpModal">
        <AppIcon name="circle-check" :size="18" class="help-icon" />
      </button>

      <div class="hero-subhead">
        <AppIcon name="sparkles" :size="14" class="sparkle-icon" />
        <span>과거의 나 vs 원칙을 지킨 나</span>
      </div>

      <h2 class="hero-title">
        같은 날, 같은 돈으로<br />
        다시 투자해 본다면?
      </h2>

      <p class="hero-description">
        최신 원칙으로 만든 나의 투자봇과 비교 기준 봇이 같은 조건에서 선택을 다시 실행해요.
      </p>

      <!-- Participants Pill Row -->
      <div class="participants-row">
        <div class="p-pill">
          <AppIcon name="user" :size="13" />
          <span>실제 나</span>
        </div>
        <div class="p-pill">
          <AppIcon name="sparkles" :size="13" />
          <span>원칙 봇</span>
        </div>
        <div class="p-pill">
          <AppIcon name="award" :size="13" />
          <span>유명 투자자</span>
        </div>
        <div class="p-pill">
          <AppIcon name="target" :size="13" />
          <span>원숭이</span>
        </div>
      </div>

      <!-- Main CTA Button -->
      <BaseButton variant="primary" block size="large" class="dark-cta" @click="emit('startSimulation')">
        <span>최신 원칙 봇 만들기</span>
        <AppIcon name="arrow-right" :size="18" />
      </BaseButton>
    </div>

    <!-- Simulation History Section -->
    <div class="history-section">
      <div class="history-header">
        <h3 class="history-title">시뮬레이션 기록</h3>
        <button class="compare-link" type="button">버전 비교</button>
      </div>

      <div class="history-list">
        <div
          v-for="(rec, idx) in historyRecords"
          :key="idx"
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
    </div>
  </div>
</template>

<style scoped>
.dashboard-page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.page-subtitle {
  font-size: 12px;
  color: #666662;
  margin-top: -6px;
}

.hero-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #f5fbfb;
  border: 1px solid #cdedea;
  border-radius: 18px;
}

.help-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #bfe4e2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #087f7c;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.hero-subhead {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #087f7c;
}

.sparkle-icon {
  color: #087f7c;
}

.hero-title {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.25;
  color: #181817;
}

.hero-description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #666662;
}

.participants-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.p-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #ffffff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: #666662;
}

.dark-cta {
  background: #263a43 !important;
  border-color: #263a43 !important;
  color: #ffffff !important;
  border-radius: 14px !important;
  height: 52px !important;
  font-weight: 800 !important;
  margin-top: 6px;
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #181817;
}

.compare-link {
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 700;
  color: #384f59;
  cursor: pointer;
}

.history-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e4e9ea;
  border-bottom: 1px solid #e4e9ea;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #eeeeea;
  cursor: pointer;
  transition: background 0.15s ease;
}

.history-item:last-child {
  border-bottom: none;
}

.v-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #087f7c;
  background: #f5fbfb;
  width: 40px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-date {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #181817;
}

.item-period {
  font-size: 11px;
  color: #94948e;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.return-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}

.return-text.positive {
  color: #dc2626;
}

.arrow-icon {
  color: #94948e;
}
</style>
