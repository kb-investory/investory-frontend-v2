<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: '아직 작성한 복기가 없어요',
  },
  description: {
    type: String,
    default: '원할 때 언제든 복기를 남길 수 있어요.',
  },
})

defineEmits(['click'])
</script>

<template>
  <aside class="review-cta">
    <AppIcon class="review-cta__icon" name="history" :size="17" />
    <span class="review-cta__copy">
      <strong>{{ title }}</strong>
      <small>{{ description }}</small>
    </span>
    <button type="button" @click="$emit('click')">
      복기 작성
      <AppIcon name="chevron-right" :size="13" />
    </button>
  </aside>
  1
</template>

<style scoped>
.review-cta {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--color-primary-soft);
  border-radius: 8px;
  background: var(--color-primary-subtle);
}

.review-cta__icon {
  color: var(--color-primary-strong);
}

.review-cta__copy {
  display: grid;
  flex: 1;
  gap: 2px;
}

strong {
  font-size: 11px;
}

small {
  color: var(--color-text-muted);
  font-size: 9px;
}

button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  gap: 4px;
  padding: 0 9px;
  border: 0;
  border-radius: 8px;
  background: var(--color-primary);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}
</style>
