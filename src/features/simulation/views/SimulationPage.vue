<script setup>
import { onMounted, ref } from 'vue'

import SimulationDashboard from '@/features/simulation/components/SimulationDashboard.vue'
import SimulationMessage from '@/features/simulation/components/SimulationMessage.vue'
import SimulationWysmiGuide from '@/features/simulation/components/SimulationWysmiGuide.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const simulationStore = useSimulationStore()
const message = ref('')
const activeTab = ref('dashboard') // 'dashboard' | 'chat'

onMounted(async () => {
  await simulationStore.fetchOverview()
  await simulationStore.fetchMessages()
})

async function handleSubmit() {
  if (!message.value.trim()) return
  await simulationStore.sendMessage(message.value)
  message.value = ''
}

// State toggle helper for demonstration & manual verification
function toggleDataState(days) {
  simulationStore.setMockDataDays(days)
}
</script>

<template>
  <div class="mobile-page">
    <AppBar title="투자 시뮬레이션" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <!-- Demo Data State Controller (For Testing Requirements) -->
      <div class="demo-controller">
        <span class="demo-controller__label">테스트용 데이터 상태 선택:</span>
        <div class="demo-controller__buttons">
          <button
            class="demo-btn"
            :class="{ active: simulationStore.isReady }"
            @click="toggleDataState(150)"
          >
            데이터 충족 (150일)
          </button>
          <button
            class="demo-btn"
            :class="{ active: !simulationStore.isReady }"
            @click="toggleDataState(3)"
          >
            데이터 부족 (3일)
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="simulationStore.loading && !simulationStore.overview" class="loading-state">
        <AppIcon name="loader-circle" :size="24" class="spin" />
        <span>시뮬레이션 개요 및 기록을 불러오는 중...</span>
      </div>

      <!-- Insufficient Data Guidance State (WYSMi Screen) -->
      <SimulationWysmiGuide
        v-else-if="!simulationStore.isReady"
        :eligible-days="simulationStore.eligibleDays"
        :min-required-days="simulationStore.MIN_REQUIRED_DAYS"
      />

      <!-- Ready State: Full Simulation Dashboard & Chat -->
      <template v-else>
        <!-- Tab Sub-Navigation -->
        <div class="tab-subnav">
          <button
            class="tab-subnav__item"
            :class="{ active: activeTab === 'dashboard' }"
            @click="activeTab = 'dashboard'"
          >
            개요 & 성과 기록
          </button>
          <button
            class="tab-subnav__item"
            :class="{ active: activeTab === 'chat' }"
            @click="activeTab = 'chat'"
          >
            AI 봇 시뮬레이터 대화
          </button>
        </div>

        <!-- Tab 1: Dashboard (Overview & Recent Completion Records) -->
        <div v-if="activeTab === 'dashboard'">
          <SimulationDashboard
            :overview="simulationStore.overview"
            :latest-result="simulationStore.latestResult"
            @start-simulation="activeTab = 'chat'"
          />
        </div>

        <!-- Tab 2: Chat Simulator -->
        <div v-else class="chat-section">
          <div class="chat-container">
            <SimulationMessage
              v-for="msg in simulationStore.messages"
              :key="msg.id"
              :message="msg"
            />
          </div>

          <form class="chat-form" @submit.prevent="handleSubmit">
            <SearchInput v-model="message" placeholder="시뮬레이션 의견을 입력하세요..." />
            <BaseButton variant="primary" type="submit"> 전송 </BaseButton>
          </form>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.demo-controller {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 11px;
}

.demo-controller__label {
  color: #475569;
  font-weight: 600;
}

.demo-controller__buttons {
  display: flex;
  gap: 6px;
}

.demo-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #64748b;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.demo-btn.active {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
  font-weight: 700;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #64748b;
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tab-subnav {
  display: flex;
  border-bottom: 2px solid #e2e8f0;
}

.tab-subnav__item {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.tab-subnav__item.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 320px;
}

.chat-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
