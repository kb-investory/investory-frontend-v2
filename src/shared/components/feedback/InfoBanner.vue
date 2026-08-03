<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: '분석 결과가 업데이트됐어요',
  },
  description: {
    type: String,
    default: '새로운 기록을 바탕으로 성향을 다시 분석했습니다.',
  },
})
</script>

<template>
  <div class="info-banner">
    <div class="info-banner__icon-wrapper">
      <AppIcon name="info" :size="16" />
    </div>

    <div class="info-banner__text-group">
      <h4 class="info-banner__title">{{ title }}</h4>
      <p class="info-banner__description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.info-banner {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #e8f7f6;
}

.info-banner__icon-wrapper {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  color: #087f7c;
  flex-shrink: 0;
}

.info-banner__text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-banner__title {
  margin: 0;
  color: #18272d;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
}

.info-banner__description {
  margin: 0;
  color: #666662;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: normal;
}
</style>
