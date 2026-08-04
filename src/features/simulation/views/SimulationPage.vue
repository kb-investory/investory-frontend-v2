<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const pageRoot = ref(null)
const selectedComparators = ref(['FAMOUS_STRATEGY'])

const STEP_PATHS = {
  home: '/simulation/dashboard',
  bot_ready: '/simulation/bot-ready',
  comparator_select: '/simulation/comparators',
  condition_setup: '/simulation/setup',
  live: '/simulation/live',
  result: '/simulation/result',
}

const STEP_BY_PATH = Object.fromEntries(
  Object.entries(STEP_PATHS).map(([step, path]) => [path, step]),
)

const currentStep = computed(() => STEP_BY_PATH[route.path] ?? 'home')

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
  await simulationStore.fetchOverview()
})

watch(currentStep, async () => {
  await nextTick()
  pageRoot.value?.closest('.mobile-main')?.scrollTo({ top: 0 })
})

// Flow step control functions
function startBotCreation() {
  router.push(STEP_PATHS.bot_ready)
}

function goToComparatorSelect() {
  router.push(STEP_PATHS.comparator_select)
}

function handleConfirmComparators(botTypes) {
  selectedComparators.value = botTypes
  router.push(STEP_PATHS.condition_setup)
}

function startLiveSimulation() {
  router.push(STEP_PATHS.live)
}

function finishLiveSimulation() {
  router.push(STEP_PATHS.result)
}

function restartFlow() {
  router.push(STEP_PATHS.home)
}

function goBack() {
  const previousSteps = {
    bot_ready: 'home',
    comparator_select: 'bot_ready',
    condition_setup: 'comparator_select',
    live: 'condition_setup',
    result: 'home',
  }

  router.push(STEP_PATHS[previousSteps[currentStep.value] ?? 'home'])
}
</script>

<template>
  <div ref="pageRoot" class="mobile-page">
    <!-- Sub-step AppBar (Shown only when in a sub-flow step) -->
    <AppBar
      v-if="currentStep !== 'home'"
      title="시뮬레이션"
      :show-back="true"
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
          :daily-performance="simulationStore.latestResult?.dailyPerformance"
          :period-start="simulationStore.latestResult?.periodStart"
          :period-end="simulationStore.latestResult?.periodEnd"
          :initial-capital="simulationStore.latestResult?.initialCapital"
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
  background: var(--bg-primary);
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

.flow-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flow-container--subflow {
  padding: 20px 20px 32px;
}
</style>
