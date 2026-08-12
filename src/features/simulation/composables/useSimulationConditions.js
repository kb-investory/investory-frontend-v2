import { computed, onUnmounted, ref, watch } from 'vue'

const DAY_IN_MS = 24 * 60 * 60 * 1000

function createDateAtOffset(periodStart, offset) {
  const date = new Date(`${periodStart}T00:00:00`)
  date.setDate(date.getDate() + offset)
  return date
}

function toApiDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useSimulationConditions(props, fetchInitialCapital) {
  const startOffset = ref(0)
  const endOffset = ref(1)
  const currentInitialCapital = ref(null)
  const capitalLoading = ref(false)
  const capitalError = ref('')
  const snapshotDate = ref(null)
  const initialHoldings = ref([])

  const maxOffset = computed(() => {
    const start = new Date(`${props.periodStart}T00:00:00`)
    const end = new Date(`${props.periodEnd}T00:00:00`)
    return Math.max(1, Math.round((end - start) / DAY_IN_MS))
  })

  watch(
    maxOffset,
    (value) => {
      startOffset.value = 0
      endOffset.value = value
    },
    { immediate: true },
  )

  const participants = computed(() => {
    const items = [
      { type: 'ACTUAL_USER', className: 'PLAYER', name: '실제 나', tone: 'actual' },
      { type: 'PERSONAL_BOT', className: 'PERSONAL', name: '나의 봇 v3', tone: 'personal' },
    ]

    if (props.selectedBotTypes.includes('FAMOUS_STRATEGY')) {
      items.push({
        type: 'FAMOUS_STRATEGY',
        className: 'LEGEND',
        name: '유명 투자자',
        tone: 'legend',
      })
    }
    if (props.selectedBotTypes.includes('RANDOM_BOT')) {
      items.push({ type: 'RANDOM_BOT', className: 'WILD', name: '원숭이', tone: 'wild' })
    }
    return items
  })

  const participantCount = computed(() => participants.value.length)
  const selectedDays = computed(() => endOffset.value - startOffset.value + 1)
  const startPercent = computed(() => (startOffset.value / maxOffset.value) * 100)
  const endPercent = computed(() => (endOffset.value / maxOffset.value) * 100)
  const dateAtOffset = (offset) => createDateAtOffset(props.periodStart, offset)
  const selectedStartDate = computed(() => dateAtOffset(startOffset.value))
  const selectedEndDate = computed(() => dateAtOffset(endOffset.value))
  const selectedStartDateStr = computed(() => toApiDate(selectedStartDate.value))

  let debounceTimer = null
  let capitalRequestId = 0
  let capitalAbortController = null

  function getCapitalErrorMessage(error) {
    const errorCode = error?.errorCode || error?.data?.detail?.code || error?.data?.code
    if (errorCode === 'INITIAL_SNAPSHOT_NOT_FOUND') {
      return '선택일 이전의 보유 데이터가 없습니다.'
    }
    if (errorCode === 'INITIAL_SNAPSHOT_NOT_BEFORE_START') {
      return '올바른 직전 보유 데이터를 찾지 못했습니다.'
    }
    return '초기자금을 계산하지 못했습니다. 다시 시도해 주세요.'
  }

  watch(
    [selectedStartDateStr, () => props.accountId],
    ([newApiDate, accountId]) => {
      const requestId = ++capitalRequestId
      capitalAbortController?.abort()
      capitalAbortController = null

      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }

      currentInitialCapital.value = null
      snapshotDate.value = null
      initialHoldings.value = []
      capitalError.value = ''

      if (!newApiDate || !accountId) {
        capitalLoading.value = false
        capitalError.value = '초기자금 조회에 필요한 계좌 정보를 찾지 못했습니다.'
        return
      }

      capitalLoading.value = true
      const updateInitialCapital = async () => {
        capitalAbortController = new AbortController()
        try {
          const response = await fetchInitialCapital(newApiDate, accountId, {
            signal: capitalAbortController.signal,
          })
          if (requestId !== capitalRequestId) return

          currentInitialCapital.value = response.totalInitialCapital
          snapshotDate.value = response.snapshotDate
          initialHoldings.value = response.holdings
        } catch (error) {
          if (requestId !== capitalRequestId || error?.name === 'AbortError') return
          capitalError.value = getCapitalErrorMessage(error)
        } finally {
          if (requestId === capitalRequestId) {
            capitalLoading.value = false
          }
        }
      }

      debounceTimer = setTimeout(updateInitialCapital, 300)
    },
    { immediate: true },
  )

  onUnmounted(() => {
    capitalRequestId += 1
    capitalAbortController?.abort()
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  function updateStart(event) {
    startOffset.value = Math.min(Number(event.target.value), endOffset.value - 1)
  }

  function updateEnd(event) {
    endOffset.value = Math.max(Number(event.target.value), startOffset.value + 1)
  }

  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}. ${month}. ${day}`
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  function getConditions() {
    return {
      periodStart: toApiDate(selectedStartDate.value),
      periodEnd: toApiDate(selectedEndDate.value),
      initialCapital: currentInitialCapital.value,
    }
  }

  return {
    startOffset,
    endOffset,
    currentInitialCapital,
    capitalLoading,
    capitalError,
    snapshotDate,
    initialHoldings,
    maxOffset,
    participants,
    participantCount,
    selectedDays,
    startPercent,
    endPercent,
    selectedStartDate,
    selectedEndDate,
    dateAtOffset,
    updateStart,
    updateEnd,
    formatDate,
    formatCurrency,
    getConditions,
  }
}
