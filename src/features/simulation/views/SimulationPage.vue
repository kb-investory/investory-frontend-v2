<script setup>
import { onMounted, ref } from 'vue'

import SimulationBotReadyCard from '@/features/simulation/components/SimulationBotReadyCard.vue'
import SimulationComparatorSelect from '@/features/simulation/components/SimulationComparatorSelect.vue'
import SimulationConditionSetup from '@/features/simulation/components/SimulationConditionSetup.vue'
import SimulationDashboard from '@/features/simulation/components/SimulationDashboard.vue'
import SimulationLiveRunner from '@/features/simulation/components/SimulationLiveRunner.vue'
import SimulationMessage from '@/features/simulation/components/SimulationMessage.vue'
import SimulationResultSummary from '@/features/simulation/components/SimulationResultSummary.vue'
import SimulationWysmiGuide from '@/features/simulation/components/SimulationWysmiGuide.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/buttons/BaseButton.vue'
import SearchInput from '@/shared/components/inputs/SearchInput.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const simulationStore = useSimulationStore()
const message = ref('')
const activeTab = ref('flow') // 'flow' | 'dashboard' | 'chat'
const currentStep = ref('ready') // 'ready' | 'comparator_select' | 'condition_setup' | 'live' | 'result'
const selectedComparators = ref(['FAMOUS_STRATEGY'])

onMounted(async () => {
  await simulationStore.fetchOverview()
  await simulationStore.fetchMessages()
})

async function handleSubmit() {
  if (!message.value.trim()) return
  await simulationStore.sendMessage(message.value)
  message.value = ''
}

// Flow step control functions
function goToComparatorSelect() {
  currentStep.value = 'comparator_select'
}

function handleConfirmComparators(botTypes) {
  selectedComparators.value = botTypes
  currentStep.value = 'condition_setup'
}

function startLiveSimulation() {
  currentStep.value = 'live'
}

function finishLiveSimulation() {
  currentStep.value = 'result'
}

function restartFlow() {
  currentStep.value = 'ready'
}

// State toggle helper for manual verification
function toggleDataState(days) {
  simulationStore.setMockDataDays(days)
}
</script>

<template>
  <div class="mobile-page">
    <AppBar title="투자 시뮬레이션" :show-back="false" :show-close="false" />

    <div class="mobile-page__content">
      <!-- Demo Data State Controller (For Verification Requirements) -->
      <div class="demo-controller">
        <span class="demo-controller__label">테스트용 데이터 상태:</span>
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

      <!-- Insufficient Data Guidance State (WYSMi Screen 1A) -->
      <SimulationWysmiGuide
        v-else-if="!simulationStore.isReady"
        :eligible-days="simulationStore.eligibleDays"
        :min-required-days="simulationStore.MIN_REQUIRED_DAYS"
      />

      <!-- Ready State: Interactive Step-by-Step Flow & Tabs -->
      <template v-else>
        <!-- Sub Navigation Tabs -->
        <div class="tab-subnav">
          <button
            class="tab-subnav__item"
            :class="{ active: activeTab === 'flow' }"
            @click="activeTab = 'flow'"
          >
            시뮬레이션 진행
          </button>
          <button
            class="tab-subnav__item"
            :class="{ active: activeTab === 'dashboard' }"
            @click="activeTab = 'dashboard'"
          >
            개요 & 성과
          </button>
          <button
            class="tab-subnav__item"
            :class="{ active: activeTab === 'chat' }"
            @click="activeTab = 'chat'"
          >
            AI 봇 대화
          </button>
        </div>

        <!-- Tab 1: Interactive Simulation Flow (Matching investory222_lucide.html) -->
        <div v-if="activeTab === 'flow'" class="flow-container">
          <!-- Step 1C: Bot Ready Card -->
          <SimulationBotReadyCard
            v-if="currentStep === 'ready'"
            @next="goToComparatorSelect"
          />

          <!-- Step 1C-2: Comparator Bot Selection -->
          <SimulationComparatorSelect
            v-else-if="currentStep === 'comparator_select'"
            @back="currentStep = 'ready'"
            @confirm="handleConfirmComparators"
          />

          <!-- Step 1D: Simulation Condition Setup -->
          <SimulationConditionSetup
            v-else-if="currentStep === 'condition_setup'"
            :period-start="simulationStore.overview?.eligiblePeriod?.startDate"
            :period-end="simulationStore.overview?.eligiblePeriod?.endDate"
            :total-days="simulationStore.overview?.eligiblePeriod?.totalDays"
            :initial-capital="simulationStore.overview?.recommendedInitialCapital"
            :selected-bot-types="selectedComparators"
            @start="startLiveSimulation"
          />

          <!-- Step 1E/1F: Live Simulation Execution -->
          <SimulationLiveRunner
            v-else-if="currentStep === 'live'"
            :participants="simulationStore.latestResult?.participantSummary"
            :simulated-trades="simulationStore.latestResult?.simulatedTrades"
            @complete="finishLiveSimulation"
          />

          <!-- Step 1G: Final Race Complete Results -->
          <SimulationResultSummary
            v-else-if="currentStep === 'result'"
            :latest-result="simulationStore.latestResult"
            @restart="restartFlow"
          />
        </div>

        <!-- Tab 2: Dashboard Overview -->
        <div v-else-if="activeTab === 'dashboard'">
          <SimulationDashboard
            :overview="simulationStore.overview"
            :latest-result="simulationStore.latestResult"
            @start-simulation="activeTab = 'flow'"
          />
        </div>

        <!-- Tab 3: Chat Simulator -->
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
