import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  compileSimulationBot,
  getLatestSimulationResult,
  getSimulationBotCompileJob,
  getSimulationComparators,
  getSimulationOverview,
  getSimulationSessions,
  sendSimulationPrompt,
} from '@/features/simulation/api/simulationApi'

export const useSimulationStore = defineStore('simulation', () => {
  const overview = ref(null)
  const latestResult = ref(null)
  const sessions = ref([])
  const messages = ref([])
  const comparators = ref([])
  const selectedComparatorTypes = ref(['FAMOUS_STRATEGY'])
  const simulationConditions = ref(null)
  const loading = ref(false)
  const comparatorsLoading = ref(false)
  const comparatorsError = ref(null)
  const botCompileStatus = ref('IDLE')
  const botCompileProgress = ref(0)
  const botCompileJobId = ref(null)
  const botCompileError = ref(null)

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

  const isBotCompiling = computed(() =>
    ['QUEUED', 'RUNNING'].includes(botCompileStatus.value),
  )
  const isBotCompileComplete = computed(() => botCompileStatus.value === 'COMPLETED')
  const isBotCompileFailed = computed(() => botCompileStatus.value === 'FAILED')

  async function fetchOverview() {
    loading.value = true
    try {
      overview.value = await getSimulationOverview()
      latestResult.value = await getLatestSimulationResult()
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
      comparators.value = await getSimulationComparators()
    } catch (error) {
      comparatorsError.value = error
      console.error('Failed to fetch simulation comparators:', error)
    } finally {
      comparatorsLoading.value = false
    }
  }

  async function compilePersonalBot() {
    if (isBotCompiling.value || isBotCompileComplete.value) return

    botCompileStatus.value = 'QUEUED'
    botCompileProgress.value = 0
    botCompileJobId.value = null
    botCompileError.value = null

    try {
      let job = await compileSimulationBot()
      botCompileJobId.value = job.jobId
      botCompileStatus.value = job.status ?? 'RUNNING'
      botCompileProgress.value = job.progressPercent ?? 0

      for (let attempt = 0; attempt < 20 && !['COMPLETED', 'FAILED'].includes(job.status); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        job = await getSimulationBotCompileJob(job.jobId)
        botCompileStatus.value = job.status
        botCompileProgress.value = job.progressPercent ?? botCompileProgress.value
      }

      if (botCompileStatus.value !== 'COMPLETED') {
        throw new Error('투자봇 생성이 완료되지 않았습니다.')
      }
    } catch (error) {
      botCompileStatus.value = 'FAILED'
      botCompileError.value = error
      console.error('Failed to compile personal simulation bot:', error)
    }
  }

  function resetBotCompilation() {
    botCompileStatus.value = 'IDLE'
    botCompileProgress.value = 0
    botCompileJobId.value = null
    botCompileError.value = null
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

  return {
    overview,
    latestResult,
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
    isBotCompiling,
    isBotCompileComplete,
    isBotCompileFailed,
    MIN_REQUIRED_DAYS,
    fetchOverview,
    fetchComparators,
    compilePersonalBot,
    resetBotCompilation,
    setSelectedComparators,
    toggleComparator,
    setSimulationConditions,
    fetchMessages,
    sendMessage,
    setMockDataDays,
  }
})
