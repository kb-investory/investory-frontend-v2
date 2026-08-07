<script setup>
import AppIcon from '@/shared/components/AppIcon.vue'

defineProps({
  icon: {
    type: String,
    default: 'landmark',
  },
  title: {
    type: String,
    default: '연결 계좌 관리',
  },
})
</script>

<template>
  <div class="list-row">
    <div class="list-row__left">
      <AppIcon :name="icon" :size="18" class="list-row__icon" />
      <span class="list-row__title">{{ title }}</span>
    </div>
    <AppIcon name="chevron-right" :size="16" class="list-row__chevron" />
  </div>
</template>

<style scoped>
.list-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  cursor: pointer;
}

.list-row__left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-row__icon {
  color: #666662;
}

.list-row__title {
  color: #18272d;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 700;
}

.list-row__chevron {
  color: #94948e;
}
</style>
