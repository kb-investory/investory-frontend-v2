import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { queryClient } from '@/app/providers/queryClient'
import {
  compileSimulationBot,
  getInitialCapital,
  getLatestSimulationResult,
  getSimulationBotCompileJob,
  getSimulationComparators,
  getSimulationHistory,
  getSimulationOverview,
  getSimulationReport,
  getSimulationSessions,
  isSimulationReportEnrichmentPending,
  runSimulation as runSimulationApi,
  saveLatestCompletedSimulationResult,
  sendSimulationPrompt,
} from '@/features/simulation/api/simulationApi'
import { queryKeys } from '@/shared/api/queryKeys'

const SIMULATION_STALE_TIME = 60 * 1000
const COMPARATOR_STALE_TIME = 10 * 60 * 1000
const REPORT_REFRESH_INTERVAL = 5000
const REPORT_REFRESH_LIMIT = 12
const MIN_PERSONAL_BOT_COMPILE_MS = 3000

export const useSimulationStore = defineStore('simulation', () => {
  const overview = ref(null)
  const latestResult = ref(null)
  const historyRecords = ref([])
  const simulationReport = ref(null)
  const simulationReportLoading = ref(false)
  const simulationReportError = ref(null)
  const sessions = ref([])
  const messages = ref([])
  const comparators = ref([])
  const selectedComparatorTypes = ref(['FAMOUS_STRATEGY', 'RANDOM_BOT'])
  const simulationConditions = ref(null)
  const initialCapital = ref(null)
  const initialCapitalLoading = ref(false)
  const initialCapitalError = ref(null)
  const loading = ref(false)
  const comparatorsLoading = ref(false)
  const comparatorsError = ref(null)
  const botCompileStatus = ref('IDLE')
  const botCompileProgress = ref(0)
  const botCompileJobId = ref(null)
  const personalBotId = ref(null)
  const botCompileError = ref(null)
  let compileRequestId = 0
  let initialCapitalRequestId = 0
  let reportRefreshTimer = null
  let reportRefreshCount = 0
  let reportRefreshGeneration = 0

  // Minimum required record days for simulation qualification
  const MIN_REQUIRED_DAYS = 90

  // 시뮬레이션 적격 기간은 일지를 작성한 날짜 수가 아니라 실제 시세가 존재하는
  // 거래일 수를 기준으로 판단한다. 초기 스냅샷 존재 여부는 API의 isReady가 검증한다.
  const eligibleDays = computed(
    () =>
      overview.value?.priceDataRange?.tradingDayCount ??
      overview.value?.eligiblePeriod?.totalDays ??
      0,
  )
  const simulationAccountId = computed(
    () => overview.value?.initialCapitalBreakdown?.accountId ?? overview.value?.accountId ?? null,
  )

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
    const filteredPositionSnapshots = Array.isArray(result.positionSnapshots)
      ? result.positionSnapshots.filter(isAllowedSnapshot)
      : null

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
      positionSnapshots: filteredPositionSnapshots,
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

  async function fetchInitialCapital(startDate, accountId, { signal } = {}) {
    const requestId = ++initialCapitalRequestId
    initialCapitalLoading.value = true
    initialCapitalError.value = null
    initialCapital.value = null

    try {
      const response = await queryClient.fetchQuery({
        queryKey: queryKeys.simulation.initialCapital(startDate, accountId),
        queryFn: ({ signal: querySignal }) =>
          getInitialCapital(startDate, accountId, { signal: signal ?? querySignal }),
        staleTime: 5 * 60 * 1000,
      })
      const responseStartDate = response?.startDate
      const snapshotDate = response?.snapshotDate

      if (responseStartDate !== startDate || !snapshotDate || snapshotDate >= responseStartDate) {
        const validationError = new Error('올바른 직전 보유 데이터를 찾지 못했습니다.')
        validationError.errorCode = 'INITIAL_SNAPSHOT_NOT_BEFORE_START'
        throw validationError
      }

      const capital = Number(response.totalInitialCapital)
      if (!Number.isFinite(capital) || capital < 0) {
        throw new Error('초기자금 응답이 올바르지 않습니다.')
      }

      if (requestId === initialCapitalRequestId) {
        initialCapital.value = capital
      }
      return {
        ...response,
        totalInitialCapital: capital,
        holdings: Array.isArray(response.holdings) ? response.holdings : [],
      }
    } catch (error) {
      if (requestId === initialCapitalRequestId) {
        initialCapitalError.value = error
      }
      throw error
    } finally {
      if (requestId === initialCapitalRequestId) {
        initialCapitalLoading.value = false
      }
    }
  }

  async function fetchSimulationReport(simulationId, { background = false, force = false } = {}) {
    const resolvedId =
      simulationId ??
      latestResult.value?.runId ??
      latestResult.value?.simulationRunId ??
      latestResult.value?.simulationRun?.simulationRunId ??
      latestResult.value?.report?.simulationRunId

    if (!resolvedId) {
      console.warn('[SimulationStore] fetchSimulationReport: simulationId를 찾을 수 없습니다.', {
        simulationId,
        latestResult: latestResult.value,
      })
      return null
    }

    if (!background) simulationReportLoading.value = true
    simulationReportError.value = null
    try {
      if (force) {
        simulationReport.value = await getSimulationReport(resolvedId)
        queryClient.setQueryData(queryKeys.simulation.report(resolvedId), simulationReport.value)
      } else {
        simulationReport.value = await queryClient.fetchQuery({
          queryKey: queryKeys.simulation.report(resolvedId),
          queryFn: () => getSimulationReport(resolvedId),
          staleTime: SIMULATION_STALE_TIME,
        })
      }
      return simulationReport.value
    } catch (error) {
      if (!background) simulationReportError.value = error
      console.error('Failed to fetch simulation report:', error)
      return null
    } finally {
      if (!background) simulationReportLoading.value = false
    }
  }

  function stopSimulationReportRefresh() {
    if (reportRefreshTimer) clearTimeout(reportRefreshTimer)
    reportRefreshTimer = null
    reportRefreshCount = 0
    reportRefreshGeneration += 1
  }

  async function startSimulationReportRefresh(simulationId) {
    stopSimulationReportRefresh()
    const refreshGeneration = reportRefreshGeneration
    const report = await fetchSimulationReport(simulationId, { force: true })
    if (refreshGeneration !== reportRefreshGeneration) return report
    if (!isSimulationReportEnrichmentPending(report)) return report

    const refresh = async () => {
      if (refreshGeneration !== reportRefreshGeneration) return
      if (reportRefreshCount >= REPORT_REFRESH_LIMIT) return
      reportRefreshCount += 1
      const refreshed = await fetchSimulationReport(simulationId, { background: true, force: true })
      if (refreshGeneration !== reportRefreshGeneration) return
      if (!isSimulationReportEnrichmentPending(refreshed)) {
        stopSimulationReportRefresh()
        return
      }
      reportRefreshTimer = setTimeout(refresh, REPORT_REFRESH_INTERVAL)
    }

    reportRefreshTimer = setTimeout(refresh, REPORT_REFRESH_INTERVAL)
    return report
  }

  async function compilePersonalBot() {
    if (isBotCompiling.value || isBotCompileComplete.value) return

    const requestId = ++compileRequestId
    const compileStartedAt = Date.now()
    botCompileStatus.value = 'QUEUED'
    botCompileProgress.value = 0
    botCompileJobId.value = null
    botCompileError.value = null

    async function waitForMinimumCompileDuration() {
      const remaining = MIN_PERSONAL_BOT_COMPILE_MS - (Date.now() - compileStartedAt)
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining))
      }
    }

    try {
      let job = await compileSimulationBot()
      if (requestId !== compileRequestId) return
      botCompileJobId.value = job.jobId
      botCompileStatus.value = ['COMPLETED', 'FAILED'].includes(job.status)
        ? 'RUNNING'
        : (job.status ?? 'RUNNING')
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
        botCompileProgress.value = job.progressPercent ?? botCompileProgress.value

        if (job.status === 'COMPLETED') {
          botCompileProgress.value = 100
          break
        }
        if (job.status === 'FAILED') break
        botCompileStatus.value = job.status ?? 'RUNNING'
      }

      if (job.status !== 'COMPLETED') {
        throw new Error('투자봇 생성이 완료되지 않았습니다.')
      }

      // 컴파일이 빠르게 끝나도 카드의 로더와 버튼 잠금 상태를 최소 3초 유지한다.
      await waitForMinimumCompileDuration()
      if (requestId !== compileRequestId) return
      personalBotId.value = job.personalBotId ?? null
      botCompileStatus.value = 'COMPLETED'
    } catch (error) {
      await waitForMinimumCompileDuration()
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
    personalBotId.value = null
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
        participantTypes: activeParticipantTypes.value,
        personalBotId: personalBotId.value,
        accountId: simulationAccountId.value,
      })
      latestResult.value = filterResultBySelectedParticipants(result)
      simulationReport.value = latestResult.value?.report ?? null
      simulationReportError.value = null
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
    void queryClient.invalidateQueries({
      queryKey: queryKeys.simulation.overview(),
      exact: true,
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.mypage.overview(),
      exact: true,
    })
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
    stopSimulationReportRefresh()
    overview.value = null
    latestResult.value = null
    historyRecords.value = []
    simulationReport.value = null
    simulationReportLoading.value = false
    simulationReportError.value = null
    sessions.value = []
    messages.value = []
    comparators.value = []
    selectedComparatorTypes.value = ['FAMOUS_STRATEGY', 'RANDOM_BOT']
    simulationConditions.value = null
    initialCapital.value = null
    initialCapitalLoading.value = false
    initialCapitalError.value = null
    initialCapitalRequestId += 1
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
    simulationReportLoading,
    simulationReportError,
    sessions,
    messages,
    comparators,
    selectedComparatorTypes,
    simulationConditions,
    initialCapital,
    initialCapitalLoading,
    initialCapitalError,
    loading,
    comparatorsLoading,
    comparatorsError,
    botCompileStatus,
    botCompileProgress,
    botCompileJobId,
    personalBotId,
    botCompileError,
    eligibleDays,
    simulationAccountId,
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
    fetchInitialCapital,
    fetchSimulationReport,
    startSimulationReportRefresh,
    stopSimulationReportRefresh,
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
