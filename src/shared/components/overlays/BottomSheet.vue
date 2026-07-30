<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  title: {
    type: String,
    default: '상세 정보',
  },
  description: {
    type: String,
    default: '선택한 항목을 확인하세요',
  },
})

defineEmits(['close'])
</script>

<template>
  <div class="bottom-sheet">
    <div class="bottom-sheet__handle-wrapper">
      <span class="bottom-sheet__handle" />
    </div>

    <header class="bottom-sheet__header">
      <div class="bottom-sheet__title-group">
        <h3 class="bottom-sheet__title">{{ title }}</h3>
        <p class="bottom-sheet__description">{{ description }}</p>
      </div>
      <button
        type="button"
        class="bottom-sheet__close"
        aria-label="닫기"
        @click="$emit('close')"
      >
        <AppIcon name="x" :size="18" />
      </button>
    </header>

    <div class="bottom-sheet__content">
      <slot>
        <div class="bottom-sheet__placeholder" />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.bottom-sheet {
  display: flex;
  width: 100%;
  flex-direction: column;
  padding: 12px 20px 20px 20px;
  border: 1px solid #dce6e9;
  border-radius: 24px 24px 0 0;
  background: #ffffff;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
}

.bottom-sheet__handle-wrapper {
  display: flex;
  justify-content: center;
  padding-bottom: 12px;
}

.bottom-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dce6e9;
}

.bottom-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.bottom-sheet__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bottom-sheet__title {
  margin: 0;
  color: #18272d;
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
}

.bottom-sheet__description {
  margin: 0;
  color: #94948e;
  font-family: var(--font-sans);
  font-size: 11px;
}

.bottom-sheet__close {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #666662;
  cursor: pointer;

  &:hover {
    color: #181817;
  }
}

.bottom-sheet__content {
  width: 100%;
}

.bottom-sheet__placeholder {
  width: 100%;
  height: 80px;
  border-radius: 12px;
  background: #f3f6f6;
}
</style>
