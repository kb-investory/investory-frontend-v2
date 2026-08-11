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
  const currentInitialCapital = ref(props.initialCapital ?? 5000000)

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
  let isFirstCall = true
  let capitalRequestId = 0

  watch(
    selectedStartDateStr,
    (newApiDate) => {
      if (!newApiDate) return

      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }

      if (isFirstCall) {
        isFirstCall = false
        if (Number(props.initialCapital) > 0) return
      }

      const requestId = ++capitalRequestId
      const updateInitialCapital = async () => {
        const capital = await fetchInitialCapital(newApiDate)
        if (requestId !== capitalRequestId) return
        if (typeof capital === 'number' && capital > 0) {
          currentInitialCapital.value = capital
        }
      }

      debounceTimer = setTimeout(updateInitialCapital, 300)
    },
    { immediate: true },
  )

  watch(
    () => props.initialCapital,
    (capital) => {
      if (typeof capital === 'number' && capital > 0) {
        currentInitialCapital.value = capital
      }
    },
  )

  onUnmounted(() => {
    capitalRequestId += 1
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
