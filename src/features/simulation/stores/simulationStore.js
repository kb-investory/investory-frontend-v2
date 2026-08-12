import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import {
  compileSimulationBot,
  getLatestSimulationResult,
  getSimulationBotCompileJob,
  getSimulationComparators,
  getSimulationHistory,
  getSimulationOverview,
  getSimulationReport,
  getSimulationSessions,
  runSimulation as runSimulationApi,
  saveLatestCompletedSimulationResult,
  sendSimulationPrompt,
} from '@/features/simulation/api/simulationApi'
import { queryKeys } from '@/shared/api/queryKeys'

const SIMULATION_STALE_TIME = 60 * 1000
const COMPARATOR_STALE_TIME = 10 * 60 * 1000

export const useSimulationStore = defineStore('simulation', () => {
  const overview = ref(null)
  const latestResult = ref(null)
  const historyRecords = ref([])
  const simulationReport = ref(null)
  const sessions = ref([])
  const messages = ref([])
  const comparators = ref([])
  const selectedComparatorTypes = ref(['FAMOUS_STRATEGY', 'RANDOM_BOT'])
  const simulationConditions = ref(null)
  const loading = ref(false)
  const comparatorsLoading = ref(false)
  const comparatorsError = ref(null)
  const botCompileStatus = ref('IDLE')
  const botCompileProgress = ref(0)
  const botCompileJobId = ref(null)
  const botCompileError = ref(null)
  let compileRequestId = 0

  // Minimum required days for simulation qualification is 7 days
  const MIN_REQUIRED_DAYS = 7

  const eligibleDays = computed(() => overview.value?.eligiblePeriod?.totalDays ?? 0)

  const isReady = computed(() => {
    if (!overview.value) return false
    return overview.value.isReady && eligibleDays.value >= MIN_REQUIRED_DAYS
  })

  const actualParticipant = computed(
    () => comparators.value.find((comparator) => comparator.variantType === 'ACTUAL_USER') ?? null,
  )

  const comparatorRoster = computed(() =>
    comparators.value.filter((comparator) => comparator.variantType !== 'ACTUAL_USER'),
  )

  const selectedParticipantCount = computed(
    () =>
      comparatorRoster.value.filter(
        (comparator) =>
          comparator.fixed || selectedComparatorTypes.value.includes(comparator.variantType),
      ).length,
  )

  const activeParticipantTypes = computed(() => [
    'ACTUAL_USER',
    ...new Set([
      ...comparatorRoster.value
        .filter((comparator) => comparator.fixed)
        .map((comparator) => comparator.variantType),
      ...selectedComparatorTypes.value,
    ]),
  ])

  function filterResultBySelectedParticipants(result) {
    if (!result) return result

    const allowedTypes = new Set(activeParticipantTypes.value)
    const variants = result.simulationVariants ?? []
    const participantSummary = result.participantSummary ?? []
    const allowedVariantIds = new Set(
      [
        ...variants
          .filter((variant) => allowedTypes.has(variant.variantType))
          .map((variant) => variant.simulationVariantId ?? variant.variantId),
        ...participantSummary
          .filter((participant) => allowedTypes.has(participant.variantType))
          .map((participant) => participant.variantId ?? participant.simulationVariantId),
      ].map(String),
    )

    const isAllowedSnapshot = (item) =>
      allowedVariantIds.has(String(item.simulationVariantId ?? item.variantId))
    const filteredTrades = (result.simulatedTrades ?? []).filter(isAllowedSnapshot)
    const filteredPerformance = (result.dailyPerformance ?? result.dailySnapshots ?? []).filter(
      isAllowedSnapshot,
    )

    return {
      ...result,
      simulationVariants: variants.filter((variant) => allowedTypes.has(variant.variantType)),
      participantSummary: participantSummary.filter((participant) =>
        allowedTypes.has(participant.variantType),
      ),
      simulatedTrades: filteredTrades,
      totalTradesCount: filteredTrades.length,
      dailyPerformance: filteredPerformance,
      dailySnapshots: filteredPerformance,
    }
  }

  const liveSimulationResult = computed(() =>
    filterResultBySelectedParticipants(latestResult.value),
  )

  const isBotCompiling = computed(() => ['QUEUED', 'RUNNING'].includes(botCompileStatus.value))
  const isBotCompileComplete = computed(() => botCompileStatus.value === 'COMPLETED')
  const isBotCompileFailed = computed(() => botCompileStatus.value === 'FAILED')

  async function fetchOverview({ force = false } = {}) {
    loading.value = true
    try {
      if (force) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.simulation.overview(),
          exact: true,
        })
      }

      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.simulation.overview(),
        queryFn: async () => {
          const [overviewData, latestData, historyData] = await Promise.all([
            getSimulationOverview(),
            getLatestSimulationResult(),
            getSimulationHistory(),
          ])
          return { overview: overviewData, latest: latestData, history: historyData || [] }
        },
        staleTime: SIMULATION_STALE_TIME,
      })
      overview.value = response.overview
      latestResult.value = response.latest
      historyRecords.value = response.history
    } catch (error) {
      console.error('Failed to fetch simulation overview:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchComparators() {
    comparatorsLoading.value = true
    comparatorsError.value = null
    try {
      comparators.value = await queryClient.fetchQuery({
        queryKey: queryKeys.simulation.comparators(),
        queryFn: getSimulationComparators,
        staleTime: COMPARATOR_STALE_TIME,
      })
    } catch (error) {
      comparatorsError.value = error
      console.error('Failed to fetch simulation comparators:', error)
    } finally {
      comparatorsLoading.value = false
    }
  }

  async function fetchSimulationReport(simulationId) {
    const resolvedId =
      simulationId ??
      latestResult.value?.simulationRunId ??
      latestResult.value?.simulationRun?.simulationRunId

    if (!resolvedId) {
      console.warn('[SimulationStore] fetchSimulationReport: simulationId를 찾을 수 없습니다.', {
        simulationId,
        latestResult: latestResult.value,
      })
      return null
    }

    try {
      simulationReport.value = await queryClient.fetchQuery({
        queryKey: queryKeys.simulation.report(resolvedId),
        queryFn: () => getSimulationReport(resolvedId),
        staleTime: SIMULATION_STALE_TIME,
      })
      return simulationReport.value
    } catch (error) {
      console.error('Failed to fetch simulation report:', error)
      return null
    }
  }

  async function compilePersonalBot() {
    if (isBotCompiling.value || isBotCompileComplete.value) return

    const requestId = ++compileRequestId
    botCompileStatus.value = 'QUEUED'
    botCompileProgress.value = 0
    botCompileJobId.value = null
    botCompileError.value = null

    try {
      let job = await compileSimulationBot()
      if (requestId !== compileRequestId) return
      botCompileJobId.value = job.jobId
      botCompileStatus.value = job.status ?? 'RUNNING'
      botCompileProgress.value = job.progressPercent ?? 0

      for (
        let attempt = 0;
        attempt < 20 && !['COMPLETED', 'FAILED'].includes(job.status);
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        if (requestId !== compileRequestId) return
        job = await getSimulationBotCompileJob(job.jobId)
        if (requestId !== compileRequestId) return
        botCompileStatus.value = job.status
        botCompileProgress.value = job.progressPercent ?? botCompileProgress.value
      }

      if (botCompileStatus.value !== 'COMPLETED') {
        throw new Error('투자봇 생성이 완료되지 않았습니다.')
      }
    } catch (error) {
      if (requestId !== compileRequestId) return
      botCompileStatus.value = 'FAILED'
      botCompileError.value = error
      console.error('Failed to compile personal simulation bot:', error)
    }
  }

  function resetBotCompilation() {
    compileRequestId += 1
    botCompileStatus.value = 'IDLE'
    botCompileProgress.value = 0
    botCompileJobId.value = null
    botCompileError.value = null
  }

  function cancelBotCompilation() {
    compileRequestId += 1
    if (isBotCompiling.value) {
      botCompileStatus.value = 'IDLE'
      botCompileProgress.value = 0
      botCompileJobId.value = null
    }
  }

  function setSelectedComparators(types) {
    const selectableTypes = new Set(
      comparatorRoster.value
        .filter((comparator) => !comparator.fixed)
        .map((comparator) => comparator.variantType),
    )

    selectedComparatorTypes.value = [...new Set(types)]
      .filter((type) => selectableTypes.has(type))
      .slice(0, 3)
  }

  function toggleComparator(type) {
    const comparator = comparatorRoster.value.find((item) => item.variantType === type)
    if (!comparator || comparator.fixed) return

    if (selectedComparatorTypes.value.includes(type)) {
      selectedComparatorTypes.value = selectedComparatorTypes.value.filter(
        (selectedType) => selectedType !== type,
      )
      return
    }

    if (selectedComparatorTypes.value.length < 3) {
      selectedComparatorTypes.value = [...selectedComparatorTypes.value, type]
    }
  }

  function setSimulationConditions(conditions) {
    simulationConditions.value = { ...conditions }
  }

  async function executeSimulation(conditions) {
    loading.value = true
    try {
      const activeConditions = conditions || simulationConditions.value
      const result = await runSimulationApi({
        periodStart: activeConditions?.periodStart,
        periodEnd: activeConditions?.periodEnd,
        initialCapital: activeConditions?.initialCapital,
        principles: activeConditions?.principles,
        participantTypes: activeParticipantTypes.value,
      })
      latestResult.value = filterResultBySelectedParticipants(result)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.simulation.overview(),
        exact: true,
      })
      return latestResult.value
    } catch (error) {
      console.error('Failed to execute simulation:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function completeSimulation() {
    if (!latestResult.value) return null
    latestResult.value = await saveLatestCompletedSimulationResult(latestResult.value)
    queryClient.setQueryData(queryKeys.simulation.latestCompleted(), latestResult.value)
    await queryClient.invalidateQueries({ queryKey: queryKeys.simulation.overview(), exact: true })
    return latestResult.value
  }

  async function fetchMessages() {
    loading.value = true
    try {
      sessions.value = await getSimulationSessions()
      messages.value = [
        {
          id: 1,
          sender: 'bot',
          content:
            '투자 원칙 시뮬레이션에 오신 것을 환영합니다. 시뮬레이션 조언 또는 매매 시나리오를 작성해주세요.',
        },
      ]
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(text) {
    messages.value.push({ id: Date.now(), sender: 'user', content: text })
    loading.value = true
    try {
      const response = await sendSimulationPrompt(1001, text)
      messages.value.push({
        id: response.messageId ?? Date.now() + 1,
        sender: 'bot',
        content: response.content ?? response[1]?.text ?? '시뮬레이션 분석이 반영되었습니다.',
      })
    } finally {
      loading.value = false
    }
  }

  // Toggle state helper for demo/testing insufficient data state vs ready state
  function setMockDataDays(days) {
    if (!overview.value) return
    overview.value = {
      ...overview.value,
      isReady: days >= MIN_REQUIRED_DAYS,
      eligiblePeriod: {
        ...overview.value.eligiblePeriod,
        totalDays: days,
      },
    }
  }

  function reset() {
    cancelBotCompilation()
    overview.value = null
    latestResult.value = null
    historyRecords.value = []
    simulationReport.value = null
    sessions.value = []
    messages.value = []
    comparators.value = []
    selectedComparatorTypes.value = ['FAMOUS_STRATEGY', 'RANDOM_BOT']
    simulationConditions.value = null
    loading.value = false
    comparatorsLoading.value = false
    comparatorsError.value = null
    resetBotCompilation()
    queryClient.removeQueries({ queryKey: queryKeys.simulation.all })
  }

  return {
    overview,
    latestResult,
    historyRecords,
    simulationReport,
    sessions,
    messages,
    comparators,
    selectedComparatorTypes,
    simulationConditions,
    loading,
    comparatorsLoading,
    comparatorsError,
    botCompileStatus,
    botCompileProgress,
    botCompileJobId,
    botCompileError,
    eligibleDays,
    isReady,
    actualParticipant,
    comparatorRoster,
    selectedParticipantCount,
    activeParticipantTypes,
    liveSimulationResult,
    isBotCompiling,
    isBotCompileComplete,
    isBotCompileFailed,
    MIN_REQUIRED_DAYS,
    fetchOverview,
    fetchComparators,
    fetchSimulationReport,
    compilePersonalBot,
    cancelBotCompilation,
    resetBotCompilation,
    setSelectedComparators,
    toggleComparator,
    setSimulationConditions,
    executeSimulation,
    completeSimulation,
    fetchMessages,
    sendMessage,
    setMockDataDays,
    reset,
  }
})
