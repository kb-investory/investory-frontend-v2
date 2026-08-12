import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/app/router/route-names'

const ROUTE_BY_STEP = Object.freeze({
  home: ROUTE_NAMES.SIMULATION_DASHBOARD,
  comparator_select: ROUTE_NAMES.SIMULATION_COMPARATORS,
  condition_setup: ROUTE_NAMES.SIMULATION_SETUP,
  live: ROUTE_NAMES.SIMULATION_LIVE,
  result: ROUTE_NAMES.SIMULATION_RESULT,
})

const STEP_BY_ROUTE = Object.freeze(
  Object.fromEntries(Object.entries(ROUTE_BY_STEP).map(([step, routeName]) => [routeName, step])),
)

const FLOW_HEADERS = Object.freeze({
  comparator_select: { title: '비교 봇 선택', step: '1 / 2' },
  condition_setup: { title: '시뮬레이션 준비', step: '2 / 2' },
  live: { title: '라이브 시뮬레이션', step: '' },
  result: { title: '시뮬레이션 결과', step: '' },
})

export function useSimulationFlow(simulationStore, pageRoot) {
  const route = useRoute()
  const router = useRouter()

  const currentStep = computed(() => STEP_BY_ROUTE[route.name] ?? 'home')
  const flowHeader = computed(
    () => FLOW_HEADERS[currentStep.value] ?? { title: '시뮬레이션', step: '' },
  )
  const effectiveMode = computed(() => {
    if (route.name === ROUTE_NAMES.SIMULATION_WYSMI || route.query.state === 'wysmi') {
      return 'wysmi'
    }

    if (
      route.name === ROUTE_NAMES.SIMULATION_DASHBOARD ||
      currentStep.value !== 'home' ||
      route.query.state === 'dashboard'
    ) {
      return 'dashboard'
    }

    return simulationStore.isReady ? 'dashboard' : 'wysmi'
  })

  async function prepareStep(step) {
    if (step === 'comparator_select') {
      void simulationStore.compilePersonalBot()
    }

    if (step === 'live' && !simulationStore.latestResult?.simulatedTrades) {
      await simulationStore.executeSimulation()
    }

    if (step === 'result') {
      await simulationStore.fetchSimulationReport()
    }
  }

  onMounted(async () => {
    await Promise.all([simulationStore.fetchOverview(), simulationStore.fetchComparators()])
    await prepareStep(currentStep.value)
  })

  onBeforeUnmount(() => {
    simulationStore.cancelBotCompilation()
  })

  watch(currentStep, async (step) => {
    await nextTick()
    pageRoot.value?.closest('.mobile-main')?.scrollTo({ top: 0 })
    await prepareStep(step)
  })

  function navigateToStep(step) {
    return router.push({ name: ROUTE_BY_STEP[step] })
  }

  function startBotCreation() {
    simulationStore.resetBotCompilation()
    return navigateToStep('comparator_select')
  }

  function handleConfirmComparators(botTypes) {
    simulationStore.setSelectedComparators(botTypes)
    return navigateToStep('condition_setup')
  }

  async function startLiveSimulation(conditions) {
    simulationStore.setSimulationConditions(conditions)
    await simulationStore.executeSimulation(conditions)
    return navigateToStep('live')
  }

  async function finishLiveSimulation() {
    await simulationStore.completeSimulation()
    return navigateToStep('result')
  }

  function restartFlow() {
    return navigateToStep('home')
  }

  function goBack() {
    const previousStep = {
      comparator_select: 'home',
      condition_setup: 'comparator_select',
      live: 'condition_setup',
      result: 'home',
    }[currentStep.value]

    return navigateToStep(previousStep ?? 'home')
  }

  return {
    currentStep,
    effectiveMode,
    flowHeader,
    startBotCreation,
    handleConfirmComparators,
    startLiveSimulation,
    finishLiveSimulation,
    restartFlow,
    goBack,
  }
}
