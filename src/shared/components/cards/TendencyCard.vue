<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: '추천에 반영된 나의 성향',
  },
  description: {
    type: String,
    default: '8가지 성향을 모두 확인할 수 있어요',
  },
  countText: {
    type: String,
    default: '8개',
  },
})
</script>

<template>
  <div class="tendency-card">
    <div class="tendency-card__left">
      <div class="tendency-card__icon-wrapper">
        <AppIcon name="radar" :size="18" />
      </div>
      <div class="tendency-card__text-group">
        <h3 class="tendency-card__title">{{ title }}</h3>
        <p class="tendency-card__description">{{ description }}</p>
      </div>
    </div>

    <div class="tendency-card__right">
      <span class="tendency-card__badge">{{ countText }}</span>
      <AppIcon name="chevron-down" :size="16" class="tendency-card__chevron" />
    </div>
  </div>
</template>

<style scoped>
.tendency-card {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid #dce6e9;
  border-radius: 14px;
  background: #ffffff;
}

.tendency-card__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tendency-card__icon-wrapper {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e8f7f6;
  color: #087f7c;
  flex-shrink: 0;
}

.tendency-card__text-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tendency-card__title {
  margin: 0;
  color: #18272d;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.tendency-card__description {
  margin: 0;
  color: #94948e;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
}

.tendency-card__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tendency-card__badge {
  padding: 2px 8px;
  border-radius: 9999px;
  background: #e8f7f6;
  color: #087f7c;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.tendency-card__chevron {
  color: #94948e;
}
</style>
