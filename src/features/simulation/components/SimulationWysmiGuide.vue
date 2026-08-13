<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import SimulationHeader from '@/features/simulation/components/SimulationHeader.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

const props = defineProps({
  eligibleDays: {
    type: Number,
    default: 3,
  },
  minRequiredDays: {
    type: Number,
    default: 90,
  },
  dataError: {
    type: Object,
    default: null,
  },
})

const router = useRouter()
const hasEnoughDays = computed(() => props.eligibleDays >= props.minRequiredDays)
const remainingDays = computed(() => Math.max(props.minRequiredDays - props.eligibleDays, 0))
const hasAccountDataError = computed(() => Boolean(props.dataError))

function goToJournalNew() {
  router.push('/journal/new')
}
</script>

<template>
  <div class="wysmi-page-container">
    <!-- Header (Screen 1A: 데이터 준비 중) -->
    <SimulationHeader
      :subtitle="
        hasEnoughDays
          ? `${minRequiredDays}일의 투자 기록은 준비됐어요.`
          : `최소 ${minRequiredDays}일의 실제 투자 데이터가 쌓이면 열려요.`
      "
    />

    <!-- Hero Card: 실제 투자 데이터를 모으고 있어요 -->
    <div class="wysmi-hero-card">
      <div class="hero-icon-wrapper">
        <AppIcon name="calendar-range" :size="26" class="hero-icon" />
      </div>

      <h2 class="hero-title">
        {{ hasEnoughDays ? '계좌 상태 데이터를 확인하고 있어요' : '실제 투자 데이터를 모으고 있어요' }}
      </h2>

      <p class="hero-description">
        <template v-if="hasEnoughDays">
          투자 기록 조건은 충족했어요.<br />
          시작 시점의 보유 종목과 평가금액을 확인하면 시뮬레이션을 열어요.
        </template>
        <template v-else>
          시뮬레이션에는 최소 {{ minRequiredDays }}일의 기록과 계좌 상태 데이터가 필요해요.<br />
          준비가 끝나면 최신 원칙으로 투자봇을 만들어요.
        </template>
      </p>
    </div>

    <!-- Progress & Checklist Card -->
    <div class="progress-card">
      <div class="progress-card__header">
        <div class="header-titles">
          <h3 class="card-title">데이터 수집 {{ eligibleDays }}일째</h3>
          <span class="card-subtitle"
            >최소 {{ minRequiredDays }}일 중 {{ eligibleDays }}일이 쌓였어요</span
          >
        </div>
        <span class="progress-count">{{ eligibleDays }} / {{ minRequiredDays }}</span>
      </div>

      <!-- Progress Track Bar -->
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${Math.min((eligibleDays / minRequiredDays) * 100, 100)}%` }"
        ></div>
      </div>

      <!-- Timeline Checklist Items -->
      <div class="checklist-group">
        <div class="checklist-item" :class="hasEnoughDays ? 'done' : 'active'">
          <div class="item-left">
            <AppIcon
              :name="hasEnoughDays ? 'circle-check' : 'history'"
              :size="18"
              :class="hasEnoughDays ? 'icon-done' : 'icon-active'"
            />
            <span class="item-text">투자 기록 {{ minRequiredDays }}일</span>
          </div>
          <span class="item-status" :class="{ active: !hasEnoughDays }">
            {{ hasEnoughDays ? '완료' : `${remainingDays}일 남음` }}
          </span>
        </div>

        <div class="checklist-item" :class="hasAccountDataError ? 'warning' : 'done'">
          <div class="item-left">
            <AppIcon
              :name="hasAccountDataError ? 'triangle-alert' : 'circle-check'"
              :size="18"
              :class="hasAccountDataError ? 'icon-warning' : 'icon-done'"
            />
            <div class="bot-text-group">
              <span class="item-text">계좌 상태 데이터</span>
              <span v-if="hasAccountDataError" class="item-subtext">
                시작일 이전의 보유 종목 정보가 필요해요
              </span>
            </div>
          </div>
          <span class="item-status" :class="{ warning: hasAccountDataError }">
            {{ hasAccountDataError ? '확인 필요' : '완료' }}
          </span>
        </div>

        <!-- Bot Compile Step -->
        <div class="checklist-item" :class="hasEnoughDays && !hasAccountDataError ? 'active' : 'pending'">
          <div class="item-left">
            <AppIcon
              name="rotate-ccw"
              :size="18"
              :class="hasEnoughDays && !hasAccountDataError ? 'icon-active spin-slow' : 'icon-pending'"
            />
            <div class="bot-text-group">
              <span class="item-text bold">최신 원칙 봇 생성</span>
              <span class="item-subtext">조건이 채워지면 약 30초 동안 자동으로 만들어요</span>
            </div>
          </div>
          <span class="item-status" :class="hasEnoughDays && !hasAccountDataError ? 'active' : 'pending'">
            {{ hasEnoughDays && !hasAccountDataError ? '•••' : '대기' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Why 90 Days Tip Banner -->
    <div class="why-7days-banner">
      <AppIcon name="sparkles" :size="18" class="tip-icon" />
      <div class="tip-content">
        <h4 class="tip-title">왜 90일이 필요한가요?</h4>
        <p class="tip-desc">
          일시적인 선택이 아니라 여러 시장 상황에서 반복된 투자 행동과 기록의 흐름을 비교하기 위해서예요.
        </p>
      </div>
    </div>

    <!-- Bottom CTA Button -->
    <div class="cta-container">
      <BaseButton variant="primary" full-width class="dark-cta" @click="goToJournalNew">
        <span>오늘의 투자 기록 남기기</span>
        <AppIcon name="pencil" :size="18" />
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.wysmi-page-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 8px 20px 32px;
  background: transparent;
  box-sizing: border-box;
}

.wysmi-hero-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 24px 20px;
  background: #f5fbfb;
  border: 1px solid #cdedea;
  border-radius: 16px;
}

.hero-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #ffffff;
  border-radius: 50%;
  color: #0b8f8b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.hero-title {
  margin: 4px 0 0 0;
  font-size: var(--font-size-body);
  font-weight: 800;
  color: #181817;
}

.hero-description {
  margin: 0;
  font-size: var(--font-size-caption);
  line-height: 1.5;
  color: #666662;
}

.progress-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e4e9ea;
  border-radius: 16px;
}

.progress-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  margin: 0;
  font-size: var(--font-size-body);
  font-weight: 800;
  color: #181817;
}

.card-subtitle {
  font-size: var(--font-size-caption);
  color: #94948e;
}

.progress-count {
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
  font-weight: 600;
  color: #384f59;
}

.progress-track {
  width: 100%;
  height: 5px;
  background: #dce6e9;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #0b8f8b;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.checklist-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.checklist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-caption);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-done {
  color: #384f59;
}

.icon-active {
  color: #0b8f8b;
}

.icon-pending {
  color: #94948e;
}

.icon-warning {
  color: #c97920;
}

.item-text {
  color: #181817;
  font-weight: 600;
}

.item-text.bold {
  font-weight: 700;
}

.pending-text {
  color: #94948e;
}

.bot-text-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.item-subtext {
  font-size: var(--font-size-caption);
  color: #94948e;
}

.item-status {
  font-size: var(--font-size-caption);
  color: #94948e;
}

.item-status.active {
  color: #0b8f8b;
  font-weight: 700;
}

.item-status.warning {
  color: #b76618;
  font-weight: 700;
}

.item-status.open-date {
  font-family: var(--font-mono);
  font-weight: 700;
  color: #384f59;
}

.why-7days-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 12px;
}

.tip-icon {
  color: #087f7c;
  flex-shrink: 0;
  margin-top: 2px;
}

.tip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-title {
  margin: 0;
  font-size: var(--font-size-caption);
  font-weight: 700;
  color: #181817;
}

.tip-desc {
  margin: 0;
  font-size: var(--font-size-caption);
  line-height: 1.4;
  color: #666662;
}

.cta-container {
  margin-top: 4px;
}

.dark-cta {
  background: #263a43 !important;
  border-color: #263a43 !important;
  color: #ffffff !important;
  border-radius: 14px !important;
  height: 52px !important;
  font-weight: 700 !important;
}

.spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
