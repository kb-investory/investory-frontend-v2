<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  badge: {
    type: String,
    default: '오늘의 기록',
  },
  title: {
    type: String,
    default: '판단을 남기면 다음 선택의 근거가 됩니다',
  },
  description: {
    type: String,
    default: '수익률보다 당시의 생각과 원칙을 먼저 확인하세요.',
  },
})
</script>

<template>
  <article class="quote-card">
    <header class="quote-card__header">
      <span class="quote-card__badge">{{ badge }}</span>
      <AppIcon name="arrow-up-right" :size="18" class="quote-card__icon" />
    </header>

    <h2 class="quote-card__title">{{ title }}</h2>
    <p class="quote-card__description">{{ description }}</p>
  </article>
</template>

<style scoped>
.quote-card {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px;
  border: 1px solid #dce6e9;
  border-radius: 16px;
  background: #ffffff;
}

.quote-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quote-card__badge {
  color: #087f7c;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  font-weight: 700;
}

.quote-card__icon {
  color: #666662;
}

.quote-card__title {
  margin: 0;
  color: #18272d;
  font-family: var(--font-heading);
  font-size: var(--font-size-body);
  font-weight: 700;
  line-height: 1.35;
}

.quote-card__description {
  margin: 0;
  color: #94948e;
  font-family: var(--font-sans);
  font-size: var(--font-size-caption);
  line-height: normal;
}
</style>
