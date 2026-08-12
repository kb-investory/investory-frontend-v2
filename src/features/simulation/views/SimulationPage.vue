<script setup>
import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SimulationComparatorSelect from '@/features/simulation/components/SimulationComparatorSelect.vue'
import SimulationConditionSetup from '@/features/simulation/components/SimulationConditionSetup.vue'
import SimulationDashboard from '@/features/simulation/components/SimulationDashboard.vue'
import SimulationLiveRunner from '@/features/simulation/components/SimulationLiveRunner.vue'
import SimulationResultSummary from '@/features/simulation/components/SimulationResultSummary.vue'
import SimulationFlowHeader from '@/features/simulation/components/SimulationFlowHeader.vue'
import SimulationWysmiGuide from '@/features/simulation/components/SimulationWysmiGuide.vue'
import { useSimulationStore } from '@/features/simulation/stores/simulationStore'
import AppIcon from '@/shared/components/AppIcon.vue'
import AppBar from '@/shared/components/navigation/AppBar.vue'

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const { selectedComparatorTypes: selectedComparators } = storeToRefs(simulationStore)
const pageRoot = ref(null)

const STEP_PATHS = {
  home: '/simulation/dashboard',
  comparator_select: '/simulation/comparators',
  condition_setup: '/simulation/setup',
  live: '/simulation/live',
  result: '/simulation/result',
}

const STEP_BY_PATH = Object.fromEntries(
  Object.entries(STEP_PATHS).map(([step, path]) => [path, step]),
)

const currentStep = computed(() => STEP_BY_PATH[route.path] ?? 'home')

const flowHeader = computed(() => {
  const headers = {
    comparator_select: { title: '비교 봇 선택', step: '1 / 2' },
    condition_setup: { title: '시뮬레이션 준비', step: '2 / 2' },
    live: { title: '라이브 시뮬레이션', step: '' },
    result: { title: '시뮬레이션 결과', step: '' },
  }

  return headers[currentStep.value] ?? { title: '시뮬레이션', step: '' }
})

// Compute effective view mode based on route path / query or store readiness
const effectiveMode = computed(() => {
  if (route.path.includes('/wysmi') || route.query.state === 'wysmi') {
    return 'wysmi'
  }
  if (
    route.path.includes('/dashboard') ||
    currentStep.value !== 'home' ||
    route.query.state === 'dashboard'
  ) {
    return 'dashboard'
  }
  return simulationStore.isReady ? 'dashboard' : 'wysmi'
})

onMounted(async () => {
  await Promise.all([simulationStore.fetchOverview(), simulationStore.fetchComparators()])
  if (currentStep.value === 'live' && !simulationStore.latestResult?.simulatedTrades) {
    await simulationStore.executeSimulation()
  }
  if (currentStep.value === 'result') {
    await simulationStore.fetchSimulationReport()
  }
  if (currentStep.value === 'comparator_select') {
    void simulationStore.compilePersonalBot()
  }
})

onBeforeUnmount(() => {
  simulationStore.cancelBotCompilation()
})

watch(currentStep, async (step) => {
  await nextTick()
  pageRoot.value?.closest('.mobile-main')?.scrollTo({ top: 0 })
  if (step === 'comparator_select') {
    void simulationStore.compilePersonalBot()
  }
  if (step === 'live' && !simulationStore.latestResult?.simulatedTrades) {
    await simulationStore.executeSimulation()
  }
  if (step === 'result') {
    await simulationStore.fetchSimulationReport()
  }
})

// Flow step control functions
function startBotCreation() {
  simulationStore.resetBotCompilation()
  router.push(STEP_PATHS.comparator_select)
}

function handleConfirmComparators(botTypes) {
  simulationStore.setSelectedComparators(botTypes)
  router.push(STEP_PATHS.condition_setup)
}

async function startLiveSimulation(conditions) {
  simulationStore.setSimulationConditions(conditions)
  await simulationStore.executeSimulation(conditions)
  router.push(STEP_PATHS.live)
}

async function finishLiveSimulation() {
  await simulationStore.completeSimulation()
  router.push(STEP_PATHS.result)
}

function restartFlow() {
  router.push(STEP_PATHS.home)
}

function goBack() {
  const previousSteps = {
    comparator_select: 'home',
    condition_setup: 'comparator_select',
    live: 'condition_setup',
    result: 'home',
  }

  router.push(STEP_PATHS[previousSteps[currentStep.value] ?? 'home'])
}
</script>

<template>
  <div ref="pageRoot" class="mobile-page">
    <SimulationFlowHeader
      v-if="currentStep !== 'home'"
      :title="flowHeader.title"
      :step="flowHeader.step"
      @back="goBack"
    />
    <!-- 서브 플로우에서는 플로팅 헤더를 사용하고, 라이브 실행 중에는 차트에 집중한다. -->
    <AppBar
      v-if="false"
      class="simulation-floating-header"
      title="시뮬레이션"
      :show-back="currentStep !== 'home'"
      :show-close="false"
      @back="goBack"
    />

    <div class="mobile-page__content">
      <!-- Loading State -->
      <div v-if="simulationStore.loading && !simulationStore.overview" class="loading-state">
        <AppIcon name="loader-circle" :size="24" class="spin" />
        <span>시뮬레이션 데이터를 불러오는 중...</span>
      </div>

      <!-- Screen 1A: Insufficient Data Guidance State (/simulation/wysmi) -->
      <SimulationWysmiGuide
        v-else-if="effectiveMode === 'wysmi'"
        :eligible-days="simulationStore.eligibleDays"
        :min-required-days="simulationStore.MIN_REQUIRED_DAYS"
      />

      <!-- Screen 1: Ready State / Main Entry Screen (/simulation/dashboard) & Interactive Flow -->
      <div
        v-else
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
          :initial-capital="simulationStore.overview?.recommendedInitialCapital"
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

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 20px;
  color: var(--text-secondary);
  font-size: var(--font-size-body);
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

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flow-container--subflow {
  padding: 20px 20px 32px;
}

.simulation-floating-header {
  position: sticky;
  top: 12px;
  z-index: 20;
  width: calc(100% - 40px);
  height: 54px;
  margin: 12px 20px -4px;
  border: 1px solid rgb(220 229 232 / 92%);
  border-radius: 18px;
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 8px 22px rgb(38 58 67 / 10%);
  backdrop-filter: blur(12px);
}

.simulation-floating-header :deep(.app-bar) {
  height: 52px;
  padding: 0 8px;
  border-radius: inherit;
  background: transparent;
}

.simulation-floating-header :deep(.app-bar__action),
.simulation-floating-header :deep(.app-bar__spacer) {
  width: 38px;
  height: 38px;
}

.simulation-floating-header :deep(.app-bar__action) {
  border-radius: 12px;
}

.simulation-floating-header :deep(.app-bar__title) {
  font-size: var(--font-size-body);
}
</style>
