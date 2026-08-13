<script setup>
import { computed } from 'vue'

import AppIcon from '@/shared/components/AppIcon.vue'
import PrimaryTabHeader from '@/shared/components/navigation/PrimaryTabHeader.vue'

const props = defineProps({
  subtitle: {
    type: String,
    default: '나의 선택을 과거 시장에서 다시 확인해요.',
  },
  overview: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['start'])

const availableDays = computed(() => props.overview?.eligiblePeriod?.totalDays ?? 0)
const recentSimulationCount = computed(() => props.overview?.recentSimulationCount ?? 0)
</script>

<template>
  <div class="simulation-header">
    <PrimaryTabHeader title="시뮬레이션" flat-bottom />

    <button class="simulation-entry" type="button" @click="emit('start')">
      <span class="simulation-entry__icon" aria-hidden="true">
        <AppIcon name="sparkles" :size="20" />
      </span>
      <span class="simulation-entry__content">
        <strong>과거의 나 vs 원칙을 지킨 나</strong>
        <small v-if="availableDays">
          분석 가능 {{ availableDays }}일 · 최근 실행 {{ recentSimulationCount }}회
        </small>
        <small v-else>{{ subtitle }}</small>
      </span>
      <span class="simulation-entry__action">
        시작
        <AppIcon name="arrow-right" :size="17" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.simulation-header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% + 40px);
  margin: -8px -20px 0;
  padding: 0 20px;
  background: transparent;
  box-sizing: border-box;
}

.simulation-header :deep(.primary-tab-header) {
  width: calc(100% + 40px);
  margin: 0 -20px;
}

.simulation-entry {
  position: relative;
  z-index: 5;
  display: grid;
  min-height: 64px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: -32px;
  padding: 9px 12px;
  border: 1px solid #b9e4e2;
  border-radius: 18px;
  color: #263a43;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(2 35 44 / 12%);
  text-align: left;
  cursor: pointer;
}

.simulation-entry__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  color: #ffffff;
  background: linear-gradient(145deg, #16bcb7, #087f7c);
  box-shadow: 0 5px 14px rgb(8 127 124 / 24%);
}

.simulation-entry__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.simulation-entry__content strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.simulation-entry__content small {
  overflow: hidden;
  color: #718087;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.simulation-entry__action {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #087f7c;
  font-size: 12px;
  font-weight: 800;
}
</style>
