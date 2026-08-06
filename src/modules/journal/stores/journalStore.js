import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  createJournal,
  getJournal,
  getJournals,
  getJournalVersion,
  updateJournal,
} from '@/modules/journal/services/journalService'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const useJournalStore = defineStore('journal', () => {
  const journals = ref([])
  const allMonthlyJournals = ref([])
  const selectedJournal = ref(null)
  const selectedVersion = ref(null)

  const selectedPeriod = ref('2026-07')
  const activeTab = ref('timeline')
  const searchQuery = ref('')
  const debouncedQuery = ref('')

  const cursor = ref(null)
  const hasMore = ref(false)
  const totalCount = ref(0)
  const totalJournalCount = ref(0)
  const isLoading = ref(false)
  const isLoadingMore = ref(false)

  let debounceTimer = null

  function setSearchQuery(query) {
    searchQuery.value = query
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedQuery.value = query
      resetAndFetch()
    }, 300)
  }

  function setPeriod(period) {
    if (selectedPeriod.value === period) return
    selectedPeriod.value = period
    resetAndFetch()
  }

  function setActiveTab(tab) {
    activeTab.value = tab
  }

  async function resetAndFetch() {
    cursor.value = null
    journals.value = []
    await fetchJournals({ isInitial: true })
  }

  async function fetchJournals({ isInitial = false } = {}) {
    if (isInitial) {
      isLoading.value = true
    } else {
      isLoadingMore.value = true
    }

    try {
      // Fetch all for monthly summary stats
      const allResults = await getJournals({
        period: selectedPeriod.value,
        query: debouncedQuery.value,
      })
      allMonthlyJournals.value = Array.isArray(allResults) ? allResults : allResults.items

      // Fetch paginated page
      const res = await getJournals({
        period: selectedPeriod.value,
        query: debouncedQuery.value,
        cursor: cursor.value,
        limit: 4,
        withPagination: true,
      })

      if (isInitial) {
        journals.value = res.items
      } else {
        journals.value = [...journals.value, ...res.items]
      }

      cursor.value = res.nextCursor
      hasMore.value = res.hasMore
      totalCount.value = res.totalCount
    } finally {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }

  async function fetchNextJournals() {
    if (!hasMore.value || isLoadingMore.value) return
    await fetchJournals({ isInitial: false })
  }

  async function fetchTotalJournalCount() {
    const results = await getJournals()
    totalJournalCount.value = Array.isArray(results) ? results.length : (results.totalCount ?? 0)
  }

  async function fetchJournal(journalId) {
    selectedJournal.value = await getJournal(journalId)
  }

  async function fetchJournalVersion(journalId, journalVersionId) {
    selectedVersion.value = await getJournalVersion(journalId, journalVersionId)
  }

  async function addJournal(payload) {
    const journal = await createJournal(payload)
    await resetAndFetch()
    await fetchTotalJournalCount()
    return journal
  }

  async function editJournal(journalId, payload) {
    const response = await updateJournal(journalId, payload)
    await resetAndFetch()
    return response
  }

  const monthlySummary = computed(() => {
    const periodJournals = allMonthlyJournals.value
    const count = periodJournals.length
    if (count === 0) {
      return {
        monthLabel: `${Number(selectedPeriod.value.split('-')[1])}월`,
        monthlyCount: 0,
        monthlyReturnRate: 0,
        formattedReturnRate: '0.00%',
        returnRateTone: 'neutral',
        additionalOpinionCount: 0,
      }
    }

    const additionalOpinionCount = periodJournals.filter(
      (j) => j.investmentAction === 'HOLD' || j.type === '추가 의견',
    ).length

    const returnSum = periodJournals.reduce((acc, j) => acc + (j.returnRate ?? 0), 0)
    const avgReturn = returnSum / count
    const formatted = (avgReturn > 0 ? '+' : '') + avgReturn.toFixed(2) + '%'
    const tone = avgReturn > 0 ? 'danger' : avgReturn < 0 ? 'primary' : 'neutral'

    return {
      monthLabel: `${Number(selectedPeriod.value.split('-')[1])}월`,
      monthlyCount: count,
      monthlyReturnRate: avgReturn,
      formattedReturnRate: formatted,
      returnRateTone: tone,
      additionalOpinionCount,
    }
  })

  function formatTime(isoString) {
    if (!isoString) return '00:00'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '00:00'
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function formatDateLabel(dateString) {
    if (!dateString) return ''
    const parts = dateString.split('-')
    if (parts.length < 3) return dateString
    const month = Number(parts[1])
    const day = Number(parts[2])
    const d = new Date(dateString)
    const weekday = WEEKDAYS[d.getDay()] || ''
    return `${month}월 ${day}일 · ${weekday}`
  }

  const dateGroupedJournals = computed(() => {
    const groupsMap = new Map()

    journals.value.forEach((item) => {
      const dateKey = item.tradeDate || item.createdAt.slice(0, 10)
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, {
          date: dateKey,
          dateLabel: formatDateLabel(dateKey),
          items: [],
        })
      }

      let actionTypeLabel = item.type || '매수'
      let actionType = 'buy'

      if (item.investmentAction === 'SELL' || item.type === '매도') {
        actionTypeLabel = '매도'
        actionType = 'sell'
      } else if (item.investmentAction === 'HOLD' || item.type === '추가 의견') {
        actionTypeLabel = '추가 의견'
        actionType = 'hold'
      }

      const returnRate = item.returnRate ?? 0
      const returnRateClass =
        returnRate > 0 ? 'text-[#E34B4B]' : returnRate < 0 ? 'text-[#3976D9]' : 'text-[#666662]'

      groupsMap.get(dateKey).items.push({
        ...item,
        time: formatTime(item.createdAt),
        actionTypeLabel,
        actionType,
        formattedUnitPrice: (item.unitPrice ?? 0).toLocaleString(),
        returnRate,
        returnRateClass,
      })
    })

    return Array.from(groupsMap.values())
  })

  const stockGroupedJournals = computed(() => {
    const groupsMap = new Map()

    journals.value.forEach((item) => {
      const stockName = item.stock || '기타'
      if (!groupsMap.has(stockName)) {
        groupsMap.set(stockName, {
          stockName,
          items: [],
        })
      }

      let actionTypeLabel = item.type || '매수'
      let actionType = 'buy'

      if (item.investmentAction === 'SELL' || item.type === '매도') {
        actionTypeLabel = '매도'
        actionType = 'sell'
      } else if (item.investmentAction === 'HOLD' || item.type === '추가 의견') {
        actionTypeLabel = '추가 의견'
        actionType = 'hold'
      }

      const returnRate = item.returnRate ?? 0
      const returnRateClass =
        returnRate > 0 ? 'text-[#E34B4B]' : returnRate < 0 ? 'text-[#3976D9]' : 'text-[#666662]'

      groupsMap.get(stockName).items.push({
        ...item,
        time: formatTime(item.createdAt),
        actionTypeLabel,
        actionType,
        formattedUnitPrice: (item.unitPrice ?? 0).toLocaleString(),
        returnRate,
        returnRateClass,
      })
    })

    return Array.from(groupsMap.values())
  })

  return {
    journals,
    allMonthlyJournals,
    selectedJournal,
    selectedVersion,
    selectedPeriod,
    activeTab,
    searchQuery,
    debouncedQuery,
    cursor,
    hasMore,
    totalCount,
    totalJournalCount,
    isLoading,
    isLoadingMore,
    monthlySummary,
    dateGroupedJournals,
    stockGroupedJournals,
    setSearchQuery,
    setPeriod,
    setActiveTab,
    fetchJournals,
    fetchNextJournals,
    fetchTotalJournalCount,
    resetAndFetch,
    fetchJournal,
    fetchJournalVersion,
    addJournal,
    editJournal,
  }
})
