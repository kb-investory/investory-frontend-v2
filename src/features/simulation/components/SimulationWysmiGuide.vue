<script setup>
import { useRouter } from 'vue-router'

import AppIcon from '@/shared/components/AppIcon.vue'
import MonkeyImage from '@/shared/components/MonkeyImage.vue'
import StatusBadge from '@/shared/components/badges/StatusBadge.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import BaseCard from '@/shared/components/cards/BaseCard.vue'

const props = defineProps({
  eligibleDays: {
    type: Number,
    default: 3,
  },
  minRequiredDays: {
    type: Number,
    default: 7,
  },
})

const router = useRouter()

function goToJournalNew() {
  router.push('/journal/new')
}
</script>

<template>
  <div class="wysmi-guide">
    <BaseCard class="wysmi-card" variant="outlined">
      <div class="wysmi-card__header">
        <StatusBadge variant="warning">
          <AppIcon name="triangle-alert" :size="12" />
          데이터 부족 ({{ eligibleDays }}/{{ minRequiredDays }}일)
        </StatusBadge>

        <span class="screen-id-tag">WYSMi</span>
      </div>

      <div class="wysmi-card__body">
        <div class="wysmi-card__image-container">
          <MonkeyImage mood="curious" :size="80" />
        </div>

        <h3 class="wysmi-card__title">시뮬레이션을 위한 데이터가 부족해요</h3>

        <p class="wysmi-card__description">
          4개 대조군 봇 백테스트 연산을 구동하려면 <strong>최소 {{ minRequiredDays }}일 이상</strong>의
          적격 거래 및 일지 데이터가 필요합니다.
        </p>

        <!-- Progress Bar -->
        <div class="wysmi-card__progress-group">
          <div class="wysmi-card__progress-info">
            <span class="progress-label">수집된 일지 데이터</span>
            <span class="progress-value">{{ eligibleDays }}일 / {{ minRequiredDays }}일</span>
          </div>

          <div class="wysmi-card__progress-bar">
            <div
              class="wysmi-card__progress-fill"
              :style="{ width: `${Math.min((eligibleDays / minRequiredDays) * 100, 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Info Tip -->
        <div class="wysmi-card__tip">
          <AppIcon name="sparkles" :size="16" class="tip-icon" />
          <span>매일 투자 일지를 작성하면 AI 봇이 회원님의 투자 스타일을 정밀하게 학습합니다.</span>
        </div>
      </div>

      <div class="wysmi-card__footer">
        <BaseButton variant="primary" block @click="goToJournalNew">
          <AppIcon name="pencil" :size="16" />
          투자 일지 작성하러 가기 (/journal/new)
        </BaseButton>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.wysmi-guide {
  width: 100%;
}

.wysmi-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.wysmi-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.screen-id-tag {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-gray-500, #94a3b8);
  background: var(--color-gray-100, #f1f5f9);
  padding: 2px 6px;
  border-radius: 4px;
}

.wysmi-card__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.wysmi-card__image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
}

.wysmi-card__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
}

.wysmi-card__description {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
}

.wysmi-card__progress-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.wysmi-card__progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.progress-label {
  color: #64748b;
  font-weight: 500;
}

.progress-value {
  color: #0f172a;
  font-weight: 700;
}

.wysmi-card__progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.wysmi-card__progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #0d9488 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.wysmi-card__tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  font-size: 12px;
  color: #166534;
  text-align: left;
}

.tip-icon {
  color: #16a34a;
  flex-shrink: 0;
}

.wysmi-card__footer {
  margin-top: 4px;
}
</style>
