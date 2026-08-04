import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  getLatestSimulationResult,
  getSimulationOverview,
  getSimulationSessions,
  sendSimulationPrompt,
} from '@/features/simulation/api/simulationApi'

export const useSimulationStore = defineStore('simulation', () => {
  const overview = ref(null)
  const latestResult = ref(null)
  const sessions = ref([])
  const messages = ref([])
  const loading = ref(false)

  // Minimum required days for simulation qualification is 7 days
  const MIN_REQUIRED_DAYS = 7

  const eligibleDays = computed(() => overview.value?.eligiblePeriod?.totalDays ?? 0)

  const isReady = computed(() => {
    if (!overview.value) return false
    return overview.value.isReady && eligibleDays.value >= MIN_REQUIRED_DAYS
  })

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
    loading,
    eligibleDays,
    isReady,
    MIN_REQUIRED_DAYS,
    fetchOverview,
    fetchMessages,
    sendMessage,
    setMockDataDays,
  }
})
