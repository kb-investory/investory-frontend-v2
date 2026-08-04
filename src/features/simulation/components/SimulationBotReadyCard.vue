<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'

defineProps({
  botVersion: {
    type: String,
    default: 'v1.0',
  },
  principlesCount: {
    type: Number,
    default: 5,
  },
  tradesCount: {
    type: Number,
    default: 34,
  },
  journalsCount: {
    type: Number,
    default: 18,
  },
})

const emit = defineEmits(['next'])
</script>

<template>
  <div class="bot-ready-container">
    <!-- Hero Banner (Screen 1C) -->
    <div class="hero-banner">
      <div class="hero-banner__icon-box">
        <AppIcon name="check" :size="22" class="icon-check" />
      </div>

      <div class="hero-banner__text-group">
        <h2 class="hero-banner__title">
          나의 최신 원칙 봇이<br />
          준비됐어요
        </h2>
        <p class="hero-banner__description">
          현재 적용 중인 원칙과 최근 기록을 바탕으로<br />
          이번 비교를 위한 투자봇을 만들었어요.
        </p>
      </div>
    </div>

    <!-- Summary Card -->
    <div class="summary-card">
      <div class="summary-card__header">
        <h3 class="summary-card__title">나의 최신 원칙 봇</h3>
        <span class="latest-badge">LATEST</span>
      </div>

      <p class="summary-card__description">
        성장 근거 확인 · 비중 관리 · 분할매매 등<br />
        현재 적용 중인 {{ principlesCount }}개 투자원칙을 반영했어요.
      </p>

      <div class="summary-card__chips">
        <span class="data-chip">거래 {{ tradesCount }}건</span>
        <span class="data-chip">일지 {{ journalsCount }}건</span>
        <span class="data-chip">원칙 {{ principlesCount }}개</span>
      </div>
    </div>

    <!-- Auto Participation Notice -->
    <div class="notice-box">
      <AppIcon name="users" :size="18" class="notice-icon" />
      <span class="notice-text">
        실제 나 · 최신 원칙 봇 · 비교 기준 봇이<br />
        같은 조건으로 자동 참가해요.
      </span>
    </div>

    <!-- Bottom Action -->
    <div class="action-footer">
      <BaseButton variant="primary" full-width @click="emit('next')">
        <span>비교 봇 선택하기</span>
        <AppIcon name="arrow-right" :size="18" />
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.bot-ready-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.hero-banner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: #263a43;
  border-radius: 18px;
  color: #ffffff;
}

.hero-banner__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: #0b8f8b;
  border-radius: 14px;
  color: #ffffff;
}

.icon-check {
  color: #ffffff;
}

.hero-banner__title {
  margin: 0;
  font-family: var(--font-sans, system-ui);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  color: #ffffff;
}

.hero-banner__description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #dce6e9;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #dce6e9;
  border-radius: 16px;
}

.summary-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #263a43;
}

.latest-badge {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: #087f7c;
  background: #e8f7f6;
  padding: 3px 8px;
  border-radius: 8px;
  letter-spacing: 0.5px;
}

.summary-card__description {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #66777d;
}

.summary-card__chips {
  display: flex;
  gap: 6px;
}

.data-chip {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  color: #087f7c;
  background: #f5fbfb;
  padding: 6px 10px;
  border-radius: 8px;
}

.notice-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f5fbfb;
  border-radius: 12px;
}

.notice-icon {
  color: #087f7c;
  flex-shrink: 0;
}

.notice-text {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #66777d;
}

.action-footer {
  width: 100%;
  margin-top: 8px;
}
</style>
