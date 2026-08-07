<script setup>
import PrimaryAppHeader from '@/shared/components/navigation/PrimaryAppHeader.vue'

defineProps({
  subtitle: {
    type: String,
    default: '나의 선택을 과거 시장에서 다시 확인해요.',
  },
})
</script>

<template>
  <div class="simulation-header">
    <PrimaryAppHeader class="simulation-header__primary" />
    <h1 class="header-title">시뮬레이션</h1>
    <p class="header-subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.simulation-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: calc(100% + 40px);
  margin: -8px -20px 0;
  padding: 0 20px 8px;
  background: #ffffff;
  box-sizing: border-box;
}

.simulation-header__primary {
  position: static;
  width: calc(100% + 40px);
  margin: 0 -20px;
}

.header-title {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-title-lg);
  font-weight: 700;
  letter-spacing: -0.4px;
  color: #181817;
  line-height: 1.2;
}

.header-subtitle {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--font-size-body);
  font-weight: 500;
  color: #666662;
  line-height: 1.4;
}
</style>
