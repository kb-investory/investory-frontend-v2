<script setup>
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

import SimulationComparatorSelect from '@/features/simulation/components/SimulationComparatorSelect.vue'
import SimulationConditionSetup from '@/features/simulation/components/SimulationConditionSetup.vue'
import SimulationDashboard from '@/features/simulation/components/SimulationDashboard.vue'
import SimulationFlowHeader from '@/features/simulation/components/SimulationFlowHeader.vue'
import SimulationLiveRunner from '@/features/simulation/components/SimulationLiveRunner.vue'
import SimulationResultSummary from '@/features/simulation/components/SimulationResultSummary.vue'
import SimulationWysmiGuide from '@/features/simulation/components/SimulationWysmiGuide.vue'
import { useSimulationFlow } from '@/features/simulation/composables/useSimulationFlow'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import PageLoading from '@/shared/components/feedback/PageLoading.vue'

const simulationStore = useSimulationStore()
const { selectedComparatorTypes: selectedComparators } = storeToRefs(simulationStore)
const pageRoot = ref(null)

const {
  currentStep,
  effectiveMode,
  flowHeader,
  startBotCreation,
  handleConfirmComparators,
  startLiveSimulation,
  finishLiveSimulation,
  restartFlow,
  goBack,
} = useSimulationFlow(simulationStore, pageRoot)

const isInitialLoading = computed(() => simulationStore.loading && !simulationStore.overview)
</script>

<template>
  <div ref="pageRoot" class="mobile-page">
    <SimulationFlowHeader
      v-if="currentStep !== 'home'"
      :title="flowHeader.title"
      :step="flowHeader.step"
      @back="goBack"
    />

    <div class="mobile-page__content">
      <!-- Loading State -->
      <PageLoading :active="isInitialLoading" />

      <!-- Screen 1A: Insufficient Data Guidance State (/simulation/wysmi) -->
      <SimulationWysmiGuide
        v-if="!isInitialLoading && effectiveMode === 'wysmi'"
        :eligible-days="simulationStore.eligibleDays"
        :min-required-days="simulationStore.MIN_REQUIRED_DAYS"
        :data-error="simulationStore.overview?.dataError"
      />

      <!-- Screen 1: Ready State / Main Entry Screen (/simulation/dashboard) & Interactive Flow -->
      <div
        v-else-if="!isInitialLoading"
        class="flow-container"
        :class="{ 'flow-container--subflow': currentStep !== 'home' }"
      >
        <!-- Step 0 (Default Entry): Screen 1 (원칙 중심) -->
        <SimulationDashboard
          v-if="currentStep === 'home'"
          :overview="simulationStore.overview"
          :latest-result="simulationStore.latestResult"
          :history-records="simulationStore.historyRecords"
          @start-simulation="startBotCreation"
        />

        <!-- Step 1C-2: Comparator Bot Selection -->
        <SimulationComparatorSelect
          v-else-if="currentStep === 'comparator_select'"
          @confirm="handleConfirmComparators"
        />

        <!-- Step 1D: Simulation Condition Setup -->
        <SimulationConditionSetup
          v-else-if="currentStep === 'condition_setup'"
          :period-start="simulationStore.overview?.eligiblePeriod?.startDate"
          :period-end="simulationStore.overview?.eligiblePeriod?.endDate"
          :total-days="simulationStore.overview?.eligiblePeriod?.totalDays"
          :account-id="simulationStore.simulationAccountId"
          :selected-bot-types="selectedComparators"
          :is-pending="simulationStore.loading"
          @start="startLiveSimulation"
        />

        <!-- Step 1E/1F: Live Simulation Execution -->
        <SimulationLiveRunner
          v-else-if="currentStep === 'live'"
          :participants="simulationStore.liveSimulationResult?.participantSummary"
          :simulated-trades="simulationStore.liveSimulationResult?.simulatedTrades"
          :daily-performance="simulationStore.liveSimulationResult?.dailyPerformance"
          :position-snapshots="simulationStore.liveSimulationResult?.positionSnapshots"
          :period-start="
            simulationStore.simulationConditions?.periodStart ??
            simulationStore.latestResult?.periodStart
          "
          :period-end="
            simulationStore.simulationConditions?.periodEnd ??
            simulationStore.latestResult?.periodEnd
          "
          :initial-capital="
            simulationStore.simulationConditions?.initialCapital ??
            simulationStore.latestResult?.initialCapital
          "
          @complete="finishLiveSimulation"
        />

        <!-- Step 1G: Final Race Complete Results -->
        <SimulationResultSummary
          v-else-if="currentStep === 'result'"
          :latest-result="simulationStore.latestResult"
          :report="simulationStore.simulationReport"
          :report-loading="simulationStore.simulationReportLoading"
          :report-error="simulationStore.simulationReportError"
          @restart="restartFlow"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-page {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  min-height: 100%;
}

.mobile-page__content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flow-container--subflow {
  padding: 20px 20px 32px;
}
</style>
