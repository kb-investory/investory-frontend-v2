<script setup>
import { onMounted, ref } from 'vue'

import SimulationBotReadyCard from '@/features/simulation/components/SimulationBotReadyCard.vue'
import SimulationComparatorSelect from '@/features/simulation/components/SimulationComparatorSelect.vue'
import SimulationConditionSetup from '@/features/simulation/components/SimulationConditionSetup.vue'
import SimulationDashboard from '@/features/simulation/components/SimulationDashboard.vue'
import SimulationLiveRunner from '@/features/simulation/components/SimulationLiveRunner.vue'
import SimulationResultSummary from '@/features/simulation/components/SimulationResultSummary.vue'
import SimulationWysmiGuide from '@/features/simulation/components/SimulationWysmiGuide.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const simulationStore = useSimulationStore()
const currentStep = ref('home') // 'home' (Screen 1 / 1A) | 'bot_ready' | 'comparator_select' | 'condition_setup' | 'live' | 'result'
const selectedComparators = ref(['FAMOUS_STRATEGY'])

onMounted(async () => {
  await simulationStore.fetchOverview()
})

// Flow step control functions
function startBotCreation() {
  currentStep.value = 'bot_ready'
}

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
  currentStep.value = 'home'
}
</script>

<template>
  <div class="mobile-page">
    <!-- Sub-step AppBar (Shown only when in a sub-flow step) -->
    <AppBar
      v-if="currentStep !== 'home'"
      title="시뮬레이션"
      :show-back="true"
      :show-close="false"
      @back="currentStep = 'home'"
    />

    <!-- Main Entry Header (Matching investory222_lucide.html Screen 1 & 1A) -->
    <header v-else class="simulation-custom-header">
      <div class="header-top-row">
        <h1 class="header-title">시뮬레이션</h1>
        <img
          src="/assets/logos/investory-logo.png"
          alt="Investory"
          class="header-logo"
        />
      </div>
      <p class="header-subtitle">
        <template v-if="simulationStore.isReady">
          나의 선택을 과거 시장에서 다시 확인해요.
        </template>
        <template v-else>
          최소 {{ simulationStore.MIN_REQUIRED_DAYS }}일의 실제 투자 데이터가 쌓이면 열려요.
        </template>
      </p>
    </header>

    <div class="mobile-page__content">
      <!-- Loading State -->
      <div v-if="simulationStore.loading && !simulationStore.overview" class="loading-state">
        <AppIcon name="loader-circle" :size="24" class="spin" />
        <span>시뮬레이션 데이터를 불러오는 중...</span>
      </div>

      <!-- Insufficient Data Guidance State (Screen 1A: 데이터 준비 중) -->
      <SimulationWysmiGuide
        v-else-if="!simulationStore.isReady"
        :eligible-days="simulationStore.eligibleDays"
        :min-required-days="simulationStore.MIN_REQUIRED_DAYS"
      />

      <!-- Ready State: Main Entry Screen (Screen 1: 원칙 중심) & Interactive Flow -->
      <div v-else class="flow-container">
        <!-- Step 0 (Default Entry): Screen 1 (원칙 중심) -->
        <SimulationDashboard
          v-if="currentStep === 'home'"
          :overview="simulationStore.overview"
          :latest-result="simulationStore.latestResult"
          @start-simulation="startBotCreation"
        />

        <!-- Step 1C: Bot Ready Card -->
        <SimulationBotReadyCard
          v-else-if="currentStep === 'bot_ready'"
          @next="goToComparatorSelect"
        />

        <!-- Step 1C-2: Comparator Bot Selection -->
        <SimulationComparatorSelect
          v-else-if="currentStep === 'comparator_select'"
          @back="currentStep = 'bot_ready'"
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
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.simulation-custom-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 0 0 0;
  background: #ffffff;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title {
  margin: 0;
  font-family: 'Funnel Sans', sans-serif;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  color: #181817;
}

.header-logo {
  width: 100px;
  height: 35px;
  object-fit: contain;
}

.header-subtitle {
  margin: 0;
  font-size: 12px;
  color: #666662;
  font-weight: 500;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
